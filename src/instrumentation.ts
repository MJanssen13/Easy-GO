/**
 * Fuso horário do servidor. Em produção (Vercel) o Node roda em UTC, e as horas
 * formatadas no servidor (páginas, server actions: próximas aferições, fim do
 * plantão às 7h/19h, linhas de evolução) sairiam 3 h adiantadas. O hospital
 * opera em Brasília; o Node relê `process.env.TZ` em tempo de execução.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";
  }
}
