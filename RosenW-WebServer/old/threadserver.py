#!/usr/bin/python
import socket
import codecs
import datetime
import os
import time
import re
import sys
from threading import Thread
import sys
import psutil

class Server:
    address_family = socket.AF_INET #IPv4 addresses
    socket_type = socket.SOCK_STREAM
    request_queue_size = 1
    main_process_running = True

    def __init__(self, server_address):
        self.listen_socket = listen_socket = socket.socket(self.address_family, self.socket_type)
        self.listen_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) #level, optname, value
        listen_socket.bind(server_address)
        listen_socket.listen(self.request_queue_size)
        print('Server started on port %s' % server_address[1])

    def start(self):
        listen_socket = self.listen_socket
        # monitorThread = Thread(target = self.start_monitoring, args=[os.getpid()]).start()

        while True:
            try:
                # New client connection
                client_connection, client_address = listen_socket.accept()
                print('accepted')
                # Handle one request and close the client connection. Then
                # loop over to wait for another client connection
                currentThread = Thread(target = self.handle_request, args=[client_connection, client_address]).start()
                print(currentThread)

            except Exception as e:
                # self.client_connection.sendall("HTTP/1.1 500 INTERNAL SERVER ERROR\n\n")
                print(e)
            finally:
                self.main_process_running = False

    def handle_request(self, client, address):
        print('HANDLING')
        #receive request data
        request = self.recv_timeout(client)
        today = datetime.date.today()
        now = str(datetime.datetime.now())

        try:
            file = open("./logs/thread-%s.txt" % today,"a+")
            file.write('IP: ' + str(client) + '\n')
            file.write('DATE: ' + now + "\n")
            file.write(request)
        except Exception as e:
            print('Error while logging: \n')
            print(e)
        finally:
            file.close()

        # Print formatted request data a la 'curl -v'
        print(''.join(
            '< {line}\n'.format(line=line)
            for line in request.splitlines()
        ))


        # Construct a response and send it back to the client
        self.send_response(request, client)
        client.close()


    def send_response(self, request, client):
        print('request before exception 79')
        print(request)
        line = request.splitlines()[0]
        line = line.rstrip('\r\n')
        # Break down the request line into components
        (method,  # GET
         path,      # /hello
         version  # HTTP/1.1
         ) = line.split()
        response = self.dispatch_request(request, client, method, path)
        client.send(response.encode('utf-8'))

    def dispatch_request(self, request, client, method, path):
        params = []
        if '?' in path:
            pathTokens = path.split('?')
            path = pathTokens[0]
            params_str = pathTokens[1]
            if '&' in params_str:
                params = params_str.split('&');
            else:
                params = [params_str]

        param_values = []
        for p in params:
            pTokens = p.split('=')
            param_values.append([pTokens[0], pTokens[1]])
        if method == 'GET':
            return self.call_get_function(path, request, param_values)
        else:
            return self.call_post_function(path, request)

    def call_get_function(self, path, request, params):
        try:
            func = {
                '/sum': self.get_sum,
                '/file': self.get_file
            }.get(path)
            return func(request, params)
        except Exception as e:
            print(e)
            return "HTTP/1.1 404 NOT FOUND\n\n"

    def call_post_function(self, path, request):
        try:
            func = {
                '/file': self.post_file
            }.get(path)
            return func(request)
        except Exception as e:
            print(e)
            return "HTTP/1.1 404 NOT FOUND\n\n"

    def get_sum(self, request, params):
        nums = []
        result = 0
        for pkv in params:
            result += int(pkv[1])
        return  """HTTP/1.1 200 OK

                <html>
                    <head>
                    </head>
                    <body>
                      <a href="/file"> Go to file </a>
                      </br>
                      <input id='result' type="text" value="{0}" disabled>
                    </body>
                </html>
                """.format(result)

    def get_file(self, request, params):
        files = os.listdir('./received-files')
        filesAsParagraphs = ''
        for file in files:
            filesAsParagraphs += '<p>'+file+'</p>\n'
        try:
            htmlf=codecs.open("./views/file.html", 'r', 'utf-8')
            returnStr = """HTTP/1.1 200 OK

                        <html>
                            <head>
                            </head>
                            <body>
                              <a href="/sum"> Go to sum </a>
                              </br>
                              <form method="post" enctype="multipart/form-data">
                                <input type='file' name='file'>
                                <input type='submit'>
                              </form>
                              <p>Uploaded Files: </p>
                              <ul>
                              {0}
                              </ul>
                            </body>
                        </html>"""
            return returnStr.format(filesAsParagraphs)
        except Exception as e:
            print('here')
            print(e)
            return "HTTP/1.1 404 NOT FOUND\n\n"

    def post_file(self, request):
        print('in post')
        inside = False
        startAppending = 0
        fileName = ''
        fileContent = ''
        for line in request.split('\n'):
            if inside == True:
                startAppending+=1
            if line[:6] == '------':
                if inside:
                    inside = False
                else:
                    inside = True
            if startAppending > 3 and inside:
                fileContent += line + '\n'
            for part in line.split():
                if part.startswith('filename='):
                    fileName = part[10:-1]

        if fileName:
            file = open("./received-files/%s" % fileName,"w+")
            file.write(fileContent)
            file.close()

        return self.get_file('redirected', [])

    def recv_timeout(self, socket, timeout=0.01):
        #make socket non blocking
        socket.setblocking(0)

        #total data partwise in an array
        total_data=[];
        data='';

        #beginning time
        begin=time.time()
        while 1:
            #if you got some data, then break after timeout
            if total_data and time.time()-begin > timeout:
                break

            #if you got no data at all, wait a little longer, twice the timeout
            elif time.time()-begin > timeout*2:
                break

            #recv something
            try:
                data = socket.recv(1024)
                if data:
                    print('data {}'.format(data))
                    print('DATA DECODED: {}'.format(data.decode('utf-8')))
                    total_data.append(data.decode('utf-8'))
                    #change the beginning time for measurement
                    begin=time.time()
                else:
                    # sleep for sometime to indicate a gap
                    time.sleep(0.1)
            except:
                pass

        #join all parts to make final string
        print('total data {}'.format(total_data))
        return ''.join(total_data)


    def start_monitoring(self, main_process):
        print('server process id: %s' % main_process)
        while self.main_process_running:
            try:
                log_file = open("./monitoring/forkserver-parameters.txt","w")
                p = psutil.Process(main_process)
                report = 'SERVER CPU AND MEMORY USAGE: \n'
                report += '----CPU USAGE: ' + str(p.cpu_percent()) + '\n'
                report += '----RSS: ' + str(p.memory_info()[0]) + '\n'
                report += '----VMS: ' + str(p.memory_info()[1]) + '\n'
                log_file.write(report)
            except Exception as e:
                print('Error while logging: \n')
                print(e)
            finally:
                log_file.close()
                time.sleep(0.1)

if __name__ == '__main__':
    port = 8888
    address = ''
    args = sys.argv
    # if len(args) == 2:
    #     port = int(args[1])
    for index in range(len(args)):
        arg = args[index]
        if arg == '-p':
            port = int(args[index + 1])
        if arg == '-a':
            address = args[index + 1]

    server = Server((address, port))
    server.start()
