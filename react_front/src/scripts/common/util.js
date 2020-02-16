let backendHost;
const hostname = window && window.location && window.location.hostname;

if(hostname === 'localhost') {
  backendHost = 'http://192.168.0.104:8000';
} else if(hostname === '127.0.0.1') {
  backendHost = 'http://192.168.0.104:8000';
}

//export const backendServerApiRoot = `${backendHost}`;

export const backendServerApiRoot = 'http://192.168.0.104:8000'