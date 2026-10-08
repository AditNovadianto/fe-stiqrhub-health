export const isTokenExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const exp = payload.exp * 1000 // JWT exp dalam detik
    return Date.now() > exp
  } catch {
    return true
  }
}