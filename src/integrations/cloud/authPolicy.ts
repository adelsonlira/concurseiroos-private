export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function describeAuthError(error: unknown): string {
  const raw = rawErrorMessage(error);

  if (/invalid login credentials/i.test(raw)) {
    return "E-mail ou senha não conferem. Em uma janela anônima, digite a senha completa novamente ou use “Esqueci minha senha”.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "O e-mail ainda não foi confirmado. Abra a mensagem enviada pelo Supabase e confirme a conta antes de entrar.";
  }
  if (/user already registered/i.test(raw)) {
    return "Já existe uma conta para este e-mail. Entre com a senha existente ou solicite a redefinição.";
  }
  if (/password should be at least/i.test(raw) || /weak password/i.test(raw)) {
    return "A senha não atende aos requisitos mínimos. Use pelo menos oito caracteres.";
  }
  if (/rate limit/i.test(raw) || /too many requests/i.test(raw)) {
    return "Muitas tentativas foram realizadas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  }
  if (/network|fetch failed|failed to fetch/i.test(raw)) {
    return "Não foi possível acessar o serviço de autenticação. Verifique a conexão e tente novamente.";
  }

  return raw;
}
