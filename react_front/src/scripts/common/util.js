let backendHost;
const hostname = window && window.location && window.location.hostname;

if(hostname === 'localhost') {
  backendHost = 'http://localhost:8000';
} else if(hostname === '127.0.0.1') {
  backendHost = 'http://127.0.0.1:8000';
}

export const backendServerApiRoot = `${backendHost}`;