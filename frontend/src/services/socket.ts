import {io} from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL, {
    withCredentials: true, // envoie le cookie de session
    autoConnect: false,    // à connecter après le login : socket.connect()
});