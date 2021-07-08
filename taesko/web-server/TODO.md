1. Automatic tests/checks
    1. Test worker timeouts, rate limiting on invalid requests.
    2. Test GET requests for binary files.
5. Refactor all usage of strings in HTTP structs to bytes.
7. Re-write ExcHandler to have handlers be it's methods.
9. Profile high cpu usage by disabling parsing and disabling serving from disk.
10. CGI script does not receive ownership of the socket.
11. writing lines in access.log must happen immediately.
12. AB Keep-Alive does not initiate a close in anyway. This 
causes it to get banned from the rate controller. Also 
recv_request() function blocks during Keep-Alive calls.
