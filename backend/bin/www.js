#!/usr/bin/env node
require('dotenv').config();

var app = require('../app');
var http = require('http');

// Função para normalizar porta
function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

// Definir porta
var port = normalizePort(process.env.PORT || '8080');
app.set('port', port);

// Criar servidor
var server = http.createServer(app);

// Iniciar servidor
server.listen(port, function() {
  console.log('✅ Servidor rodando na porta ' + port);
  console.log('📡 Acesse: http://localhost:' + port);
});

// Tratar erros
server.on('error', function(error) {
  if (error.syscall !== 'listen') throw error;
  
  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  
  if (error.code === 'EACCES') {
    console.error('❌ ' + bind + ' requer privilégios de administrador');
    process.exit(1);
  } else if (error.code === 'EADDRINUSE') {
    console.error('❌ ' + bind + ' já está em uso');
    process.exit(1);
  } else {
    throw error;
  }
});