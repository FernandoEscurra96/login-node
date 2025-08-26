require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 3000;

// Conexión a Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: "mi_clave_secreta",
    resave: false,
    saveUninitialized: true,
}));

// Ruta principal
app.get("/", (req, res) => {
    if (req.session.user) {
        res.send(`<h1>Bienvenido ${req.session.user.username}</h1>
                  <a href="/logout">Cerrar sesión</a>`);
    } else {
        res.send(`<h1>Login con Supabase</h1>
                  <form action="/register" method="POST">
                      <h2>Registro</h2>
                      <input type="text" name="username" placeholder="Usuario" required />
                      <input type="password" name="password" placeholder="Contraseña" required />
                      <button type="submit">Registrar</button>
                  </form>
                  <br>
                  <form action="/login" method="POST">
                      <h2>Iniciar sesión</h2>
                      <input type="text" name="username" placeholder="Usuario" required />
                      <input type="password" name="password" placeholder="Contraseña" required />
                      <button type="submit">Entrar</button>
                  </form>`);
    }
});

// Registro
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase
        .from("users")
        .insert([{ username, password: hashedPassword }]);

    if (error) {
        return res.send(`Error al registrar usuario: ${error.message} <a href='/'>Volver</a>`);
    }

    res.send("Usuario registrado con Supabase. <a href='/'>Volver</a>");
});

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

    if (error || !user) {
        return res.send("Usuario no encontrado. <a href='/'>Intentar de nuevo</a>");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (validPassword) {
        req.session.user = { id: user.id, username: user.username };
        res.redirect("/");
    } else {
        res.send("Contraseña incorrecta. <a href='/'>Intentar de nuevo</a>");
    }
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
