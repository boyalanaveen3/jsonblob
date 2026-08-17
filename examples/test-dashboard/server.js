const http = require("http");

const PORT = 3001;

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sample Application Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 0 auto 1.5rem; }
    h1, h2 { margin-top: 0; }
    input, button { display: block; width: 100%; padding: 0.75rem; margin-top: 0.75rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: white; box-sizing: border-box; }
    button { background: #2563eb; font-weight: bold; cursor: pointer; border: none; }
    button:hover { background: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #334155; padding: 0.5rem 0.75rem; text-align: left; }
    .alert { padding: 0.75rem; background: #ef444422; border: 1px solid #ef4444; color: #fca5a5; border-radius: 6px; display: none; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card" id="login-card">
    <h1>Login to Sample Dashboard</h1>
    <p>Enter your user credentials to access the administrative workspace.</p>
    <div id="error-alert" class="alert" role="alert">Invalid username or password credentials!</div>
    <form id="login-form">
      <label for="username">Username / Email</label>
      <input type="text" id="username" name="username" placeholder="admin@example.com" required />
      <label for="password" style="margin-top: 0.75rem; display:block;">Password</label>
      <input type="password" id="password" name="password" placeholder="••••••••" required />
      <button type="submit" id="login-btn">Login</button>
    </form>
  </div>

  <div class="card" id="dashboard-card" style="display: none;">
    <h1>Sample Application Dashboard</h1>
    <p>Welcome back, <strong id="user-display">Admin</strong>!</p>
    
    <h2>User Management Table</h2>
    <table>
      <thead>
        <tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th></tr>
      </thead>
      <tbody id="user-table-body">
        <tr><td>1</td><td>Naveen Boyala</td><td>Administrator</td><td>Active</td></tr>
        <tr><td>2</td><td>Sarah Connor</td><td>QA Automation Lead</td><td>Active</td></tr>
        <tr><td>3</td><td>Alex Mercer</td><td>DevOps Engineer</td><td>Active</td></tr>
      </tbody>
    </table>
    
    <button id="logout-btn" style="background: #475569; margin-top: 1.5rem;">Logout</button>
  </div>

  <script>
    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const u = document.getElementById('username').value;
      const p = document.getElementById('password').value;
      const err = document.getElementById('error-alert');

      if (u === 'invalid_user@test.com' || p === 'wrong_password') {
        err.style.display = 'block';
      } else {
        err.style.display = 'none';
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('dashboard-card').style.display = 'block';
        document.getElementById('user-display').textContent = u;
      }
    });

    document.getElementById('logout-btn').addEventListener('click', function() {
      document.getElementById('dashboard-card').style.display = 'none';
      document.getElementById('login-card').style.display = 'block';
    });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/api/users" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify([
      { id: 1, name: "Naveen Boyala", role: "Admin" },
      { id: 2, name: "Sarah Connor", role: "QA Lead" }
    ]));
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(HTML_CONTENT);
});

server.listen(PORT, () => {
  console.log(`Sample Web App running at http://localhost:${PORT}`);
});
