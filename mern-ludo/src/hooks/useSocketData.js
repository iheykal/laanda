import { useState, useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../App';

const useSocketData = port => {
    const socket = useContext(SocketContext);
    const [data, setData] = useState(null);
    const handlerRef = useRef(null);
    
    useEffect(() => {
        // Create handler function
        handlerRef.current = (res) => {
            let parsedData;
            try {
                parsedData = JSON.parse(res);
            } catch (error) {
                parsedData = res;
            }
            console.log(`📥 Received ${port} event:`, parsedData);
            setData(parsedData);
        };
        
        // Register listener
        socket.on(port, handlerRef.current);
        console.log(`👂 Registered listener for ${port}`);
        
        // Cleanup: remove listener when component unmounts or port changes
        return () => {
            if (handlerRef.current) {
                console.log(`🧹 Removing listener for ${port}`);
                socket.off(port, handlerRef.current);
                handlerRef.current = null;
            }
        };
    }, [socket, port]);
    
    return [data, setData];
};

export default useSocketData;
