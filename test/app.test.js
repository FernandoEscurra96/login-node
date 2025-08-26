const request = require('supertest');
const http = require('http');
const express = require('express');
const session = require('express-session');

// ---------------------------
// Servidor mínimo simulado
// ---------------------------
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'test_secret',
  resave: false,
  saveUninitialized: false
}));

// Middleware de autenticación
function authMiddleware(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autorizado');
  next();
}

// Mock de usuarios
const mockUsers = [];

// Rutas
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (mockUsers.find(u => u.email === email)) return res.status(400).send('Usuario ya existe');
  console.log("email")
  console.log(email)
  console.log(password)
  mockUsers.push({ email, password });
  res.status(201).send('Registro exitoso');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).send('Credenciales inválidas');

  req.session.user = { email };
  res.status(200).send('Login exitoso');
});

app.get('/dashboard', authMiddleware, (req, res) => {
  res.status(200).send(`Bienvenido ${req.session.user.email}`);
});

app.get('/logout', authMiddleware, (req, res) => {
  req.session.destroy(() => res.status(200).send('Logout exitoso'));
});

// ---------------------------
// Tests
// ---------------------------
let server;
let agent;

beforeAll(done => {
  server = http.createServer(app).listen(() => {
    agent = request.agent(server); // Agent mantiene cookies y sesión
    done();
  });
});

afterAll(done => {
  server.close(done);
});

describe('Pruebas completas de autenticación con sesión', () => {
  const testUser = { email: 'testuser@example.com', password: '12345678' };

  test('Registro de usuario', async () => {
    //const res = await agent.post('/register').send(testUser);

    const res = await agent
      .post('/register')
      .send({ email: testUser.email, password: testUser.password })
      .set('Content-Type', 'application/x-www-form-urlencoded'); // importante
    expect(res.status).toBe(201);
    expect(res.text).toBe('Registro exitoso');
  });

  test('Registro duplicado falla', async () => {
    //await agent.post('/register').send(testUser);
    const res = await agent
      .post('/register')
      .send({ email: testUser.email, password: testUser.password })
      .set('Content-Type', 'application/x-www-form-urlencoded'); // importante
    //const res = await agent.post('/register').send(testUser);
    expect(res.status).toBe(400);
    expect(res.text).toBe('Usuario ya existe');
  });

  test('Login con credenciales correctas', async () => {
    //await agent.post('/register').send(testUser);
    const res = await agent
      .post('/login')
      .send({ email: testUser.email, password: testUser.password })
      .set('Content-Type', 'application/x-www-form-urlencoded'); // importante
    //const res = await agent.post('/login').send(testUser);
    expect(res.status).toBe(200);
    expect(res.text).toBe('Login exitoso');
  });

  test('Login con credenciales incorrectas falla', async () => {
    const res = await agent.post('/login').
    send({ email: 'wrong@test.com', password: '1234' })
    .set('Content-Type', 'application/x-www-form-urlencoded'); // importante;
    expect(res.status).toBe(400);
    expect(res.text).toBe('Credenciales inválidas');
  });

  test('Dashboard protegido sin login devuelve 401', async () => {
    const newAgent = request.agent(server); // otro agent sin login
    const res = await newAgent.get('/dashboard');
    expect(res.status).toBe(401);
    expect(res.text).toBe('No autorizado');
  });

  test('Dashboard con sesión activa funciona', async () => {
    await agent.post('/register').send(testUser);
    await agent.post('/login').send(testUser);

    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain(testUser.email);
  });

  test('Logout funciona y bloquea acceso al dashboard', async () => {
    await agent.post('/register').send(testUser);
    await agent.post('/login').send(testUser);

    const resLogout = await agent.get('/logout');
    expect(resLogout.status).toBe(200);
    expect(resLogout.text).toBe('Logout exitoso');

    const resDashboard = await agent.get('/dashboard');
    expect(resDashboard.status).toBe(401);
  });
});
