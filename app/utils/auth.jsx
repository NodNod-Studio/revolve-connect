export function checkToken(request) {
  // Check header Authorization Bearer token
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  return token && token === process.env.API_TOKEN
}