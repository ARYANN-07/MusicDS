import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:8080';

async function proxyRequest(req: NextRequest, path: string, method: string) {
  const targetUrl = `${BACKEND_URL}/${path}${req.nextUrl.search}`;

  try {
    const init: RequestInit = { method };
    if (method === 'POST' || method === 'PUT') {
      const body = await req.text();
      init.body = body;
      init.headers = { 'Content-Type': 'application/json' };
    }
    const res = await fetch(targetUrl, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'C++ backend unavailable. Start the server: cd backend && .\\build\\Release\\musicds-backend.exe' },
      { status: 503 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'), 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'), 'POST');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'), 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
