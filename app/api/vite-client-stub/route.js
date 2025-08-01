// Stub API route to handle @vite/client requests from MDXEditor
export async function GET() {
  return new Response('// Vite client stub for MDXEditor compatibility', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
    },
  });
}