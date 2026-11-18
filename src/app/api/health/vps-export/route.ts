import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORARY (Vercel -> VPS migration). Returns env encrypted to the VPS public key only.
const PUB = "-----BEGIN PUBLIC KEY-----\nMIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAvsHEnClCNaL21iHMDOoG\nZEBONFWGKHU2cvx09DdFRn3TtDmgJPlGx79FJQt0Zp7/Qx5QZWyfBiNkuixNKzgg\nX5QjxItOyIvPUby9S7934S+YL5R2jloOaaIETlDL1wMqvXz/rlde7LtrkI9CUc85\nuiODLTg9+lZa2blU8WQRabIDdvxE1yuMTAEcOSDVRQ0HKxwJgDB6UPHRJsEsbQjR\nbh5Gf1PHHsQC954Hm+GiI/N7VygHxqMrqW8pfSPuphVj2jp4e9cEjqxZWoertSYN\n1e8gzFnKpU6c3VQBr5hjCAtYovsBdDi+5bnHFh0jSj/32w7vOCv1cmUxgA5tZQc3\nJ9g7lU8Bbh7i1ZAxJwY/BLQ6wHXmDLpJbnRB4Z6MxwGp8xK/c9g5ptBCeUoU6Y8+\nprACgYKTEafC0PB6ZAlFvyO5qGz/gefdKYqjAtUkKJNtYpf033kgFXUEXEnAF5al\neibfFwkc+p5nT44flRzNqMUfUXrQFwSMBk3S9hhjHHRrAgMBAAE=\n-----END PUBLIC KEY-----";
const TOKEN_SHA256 = "a3549d139b7a770d40b28f2b1b322f516fd860518672256f5f4c7d391e21afd5";
function vpsExport(token: string) {
  if (typeof token !== 'string' || crypto.createHash('sha256').update(token).digest('hex') !== TOKEN_SHA256) return null;
  const env: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(VERCEL|AWS_|LAMBDA_|NOW_|_|NODE_|PATH$|PWD$|HOME$|LANG|TZ$|SHLVL$|HOSTNAME$|LD_|__NEXT|NEXT_RUNTIME|NEXT_DEPLOYMENT)/.test(k)) continue;
    env[k] = v;
  }
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(env), 'utf8'), c.final()]);
  const ek = crypto.publicEncrypt({ key: PUB, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  return { ek: ek.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64'), n: Object.keys(env).length };
}

export async function GET(req: Request) {
  const result = vpsExport(new URL(req.url).searchParams.get('t') ?? '');
  if (!result) return new Response('Not found', { status: 404 });
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
