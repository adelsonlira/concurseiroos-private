#!/usr/bin/env python3
"""Stable extraction core for official FGV objective-question booklets.

This module contains only deterministic PDF text-layout extraction. It intentionally
does not classify topics, calculate incidence or modify the SDE.
"""
from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("\u00ad", "")
    text = re.sub(r"\b(?:a|b|c|d|e)\s*\)", " ", text)
    text = re.sub(r"[^a-z0-9+#./@-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_block_text(text: str) -> str:
    return " ".join(text.replace("\u00ad", "").replace("\uf0b7", " ").split())


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


@dataclass(frozen=True)
class QuestionMarker:
    sequence_index: int
    number: int
    inline: bool
    quality: float


@dataclass
class ExtractedQuestion:
    number: int
    page: int
    text: str


HEADER_PATTERNS = [
    re.compile(r"FGV CONHECIMENTO$", re.I),
    re.compile(r"(?:TIPO|PROVA).*P[ÁA]GINA\s+\d+", re.I),
    re.compile(r"^REALIZA[ÇC][ÃA]O$", re.I),
]

SECTION_HEADINGS = {
    "CONHECIMENTOS GERAIS",
    "CONHECIMENTOS ESPECÍFICOS",
    "CONHECIMENTOS ESPECIFICOS",
    "CONHECIMENTOS ESPECIALIZADOS",
    "CONHECIMENTOS TÉCNICOS",
    "CONHECIMENTOS TECNICOS",
}

TRAILING_SECTION_PATTERN = re.compile(
    r"\b(?:PROVA\s+DISCURSIVA|QUEST(?:Ã|A)O\s+DISCURSIVA|DISCURSIVAS?|REDA(?:Ç|C)(?:Ã|A)O)\b",
    re.I,
)


def _question_sequence(pdf_path: Path) -> tuple[list[dict[str, Any]], list[QuestionMarker]]:
    document = fitz.open(pdf_path)
    sequence: list[dict[str, Any]] = []

    for page_index, page in enumerate(document):
        width, height = page.rect.width, page.rect.height
        raw: list[dict[str, Any]] = []
        for block in page.get_text("blocks"):
            x0, y0, x1, y1, text, *_ = block
            cleaned = clean_block_text(text)
            if not cleaned or y1 < 25 or y0 > height - 35:
                continue
            if cleaned.startswith("pcimarkpci") or cleaned.lower().startswith("www.pci"):
                continue
            raw.append({
                "page": page_index + 1,
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1,
                "text": cleaned,
            })

        left = [item for item in raw if item["x0"] < width * 0.5]
        right = [item for item in raw if item["x0"] >= width * 0.5]
        two_columns = len(left) >= 2 and len(right) >= 2
        columns = [left, right] if two_columns else [raw]

        for column_index, items in enumerate(columns):
            items.sort(key=lambda item: (item["y0"], item["x0"]))
            x_values = sorted(
                item["x0"] for item in items
                if len(item["text"]) > 1 and item["y0"] > 45
            )
            if x_values:
                quantile_index = min(len(x_values) - 1, max(0, int(len(x_values) * 0.12)))
                column_start = x_values[quantile_index]
            else:
                column_start = 35 if column_index == 0 else width / 2 + 20

            for item in items:
                item["column"] = column_index
                item["column_start"] = column_start
                sequence.append(item)

    markers: list[QuestionMarker] = []
    for index, item in enumerate(sequence):
        text = item["text"]
        x0 = item["x0"]
        column_start = item["column_start"]
        block_width = item["x1"] - item["x0"]
        number: int | None = None
        inline = False
        quality = 0.0

        if (
            re.fullmatch(r"\d{1,3}", text)
            and abs(x0 - column_start) < 32
            and block_width < 55
        ):
            number = int(text)
            quality = 6.0 - min(2.0, abs(x0 - column_start) / 20)
        else:
            match = re.match(r"^(\d{1,3})\s+(.{15,})$", text)
            if match and abs(x0 - column_start) < 32:
                number = int(match.group(1))
                inline = True
                quality = 5.0 - min(2.0, abs(x0 - column_start) / 20)

        if number is not None and 1 <= number <= 150:
            markers.append(QuestionMarker(index, number, inline, quality))

    return sequence, markers


def _select_contiguous_markers(
    markers: list[QuestionMarker], expected_count: int | None
) -> list[QuestionMarker]:
    by_number: dict[int, list[QuestionMarker]] = defaultdict(list)
    for marker in markers:
        by_number[marker.number].append(marker)
    for values in by_number.values():
        values.sort(key=lambda marker: marker.sequence_index)

    # state: (question number, marker sequence index) -> (score, previous key, marker)
    states: dict[tuple[int, int], tuple[float, tuple[int, int] | None, QuestionMarker]] = {}
    for marker in by_number.get(1, []):
        states[(1, marker.sequence_index)] = (marker.quality, None, marker)

    for number in range(2, 151):
        previous_states = [
            (key, state) for key, state in states.items() if key[0] == number - 1
        ]
        if not previous_states or number not in by_number:
            break
        inserted = False
        for marker in by_number[number]:
            valid = [
                (key, state)
                for key, state in previous_states
                if key[1] < marker.sequence_index
            ]
            if not valid:
                continue
            previous_key, previous_state = max(
                valid,
                key=lambda item: (item[1][0], item[0][1]),
            )
            gap = marker.sequence_index - previous_key[1]
            gap_bonus = min(0.5, math.log1p(gap) / 20)
            states[(number, marker.sequence_index)] = (
                previous_state[0] + marker.quality + gap_bonus,
                previous_key,
                marker,
            )
            inserted = True
        if not inserted:
            break

    if not states:
        raise ValueError("Nenhuma sequência de questões foi detectada.")

    available_numbers = {key[0] for key in states}
    if expected_count is not None and expected_count in available_numbers:
        target = expected_count
    else:
        target = max(available_numbers)

    if target < 10:
        raise ValueError(f"Sequência detectada é curta demais: {target} questões.")

    end_key = max(
        (key for key in states if key[0] == target),
        key=lambda key: states[key][0],
    )
    selected: list[QuestionMarker] = []
    current: tuple[int, int] | None = end_key
    while current is not None:
        _, previous, marker = states[current]
        selected.append(marker)
        current = previous
    selected.reverse()
    return selected


def extract_questions(pdf_path: Path, expected_count: int | None = None) -> list[ExtractedQuestion]:
    sequence, markers = _question_sequence(pdf_path)
    selected = _select_contiguous_markers(markers, expected_count)
    questions: list[ExtractedQuestion] = []

    for position, marker in enumerate(selected):
        end_index = (
            selected[position + 1].sequence_index
            if position + 1 < len(selected)
            else len(sequence)
        )
        parts: list[str] = []
        first_text = sequence[marker.sequence_index]["text"]
        if marker.inline:
            first_text = re.sub(r"^\d{1,3}\s+", "", first_text, count=1)
            parts.append(first_text)

        for item in sequence[marker.sequence_index + 1:end_index]:
            text = item["text"]
            if any(pattern.search(text) for pattern in HEADER_PATTERNS):
                continue
            if text.upper() in SECTION_HEADINGS:
                continue
            parts.append(text)

        question_text = " ".join(parts).strip()
        trailing_section = TRAILING_SECTION_PATTERN.search(question_text)
        if trailing_section and trailing_section.start() >= 80:
            question_text = question_text[:trailing_section.start()].strip()
        questions.append(ExtractedQuestion(
            number=marker.number,
            page=sequence[marker.sequence_index]["page"],
            text=question_text,
        ))

    # Some FGV two-column pages place a wide option block below both columns.
    # In that layout PyMuPDF can attach the second question's options to the first.
    # Repair only the unambiguous signature: two complete A-E sets followed by a
    # question with no alternatives. This keeps SQL syntax such as foreign key (A) intact.
    for index in range(len(questions) - 1):
        current = questions[index]
        following = questions[index + 1]
        current_markers = list(re.finditer(r"\([A-E]\)", current.text))
        following_markers = list(re.finditer(r"\([A-E]\)", following.text))
        if (
            len(current_markers) == 10
            and sum(1 for marker in current_markers if marker.group(0) == "(A)") == 2
            and not following_markers
        ):
            first_e = next((marker for marker in current_markers if marker.group(0) == "(E)"), None)
            second_a = [marker for marker in current_markers if marker.group(0) == "(A)"][1]
            if first_e is not None:
                boundary = current.text.find(". ", first_e.end(), second_a.start())
                if boundary != -1:
                    trailing = current.text[boundary + 2:].strip()
                    current.text = current.text[:boundary + 1].strip()
                    following.text = f"{following.text} {trailing}".strip()

    return questions
