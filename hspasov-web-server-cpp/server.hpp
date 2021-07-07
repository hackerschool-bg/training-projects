#ifndef SERVER_HPP
#define SERVER_HPP

#include "file_descriptor.hpp"
#include "socket.hpp"
#include "client_connection.hpp"
#include "logger.hpp"
#include "error.hpp"
#include "config.hpp"
#include "addrinfo_res.hpp"
#include <cstdlib>
#include <cerrno>
#include <unistd.h>
#include <sys/socket.h>
#include <netdb.h>
#include <csignal>
#include <sys/wait.h>

void reap_child_proc (int sig_num) {
  constexpr int any_pid = -1;

  while (true) {
    int exit_status = 0;

    const int child_pid = waitpid(any_pid, &exit_status, WNOHANG);

    if (child_pid <= 0) {
      break;
    }
  }
}

class Server {
  protected:
    FileDescriptor socket_fd;
  public:
    Server () {
      Logger::error(DEBUG, {});

      // 0 is for protocol: "only a single protocol exists to support a particular socket type within a given protocol family, in which case protocol can be specified as 0" - from man page
      int socket_fd = socket(AF_INET, SOCK_STREAM, 0);

      if (socket_fd < 0) {
        throw Error(OSERR, "socket: " + std::string(std::strerror(errno)), errno);
      }

      this->socket_fd = FileDescriptor(socket_fd);

      // setting socket options:

      constexpr int on = 1;

      if (setsockopt(this->socket_fd._fd, SOL_SOCKET, SO_REUSEADDR, &on, sizeof(on)) < 0) {
        throw Error(OSERR, "setsockopt: " + std::string(std::strerror(errno)), errno);
      }

      // setting child reaping:

      struct sigaction action {};
      action.sa_handler = &reap_child_proc;
      action.sa_flags = SA_NOCLDSTOP;

      if (sigaction(SIGCHLD, &action, nullptr) < 0) {
        throw Error(OSERR, "sigaction: " + std::string(std::strerror(errno)), errno);
      }
    }

    Server (const Server&) = delete;
    Server (Server&&) = default;
    Server& operator= (const Server&) = delete;
    Server& operator= (Server&&) = default;
    ~Server() = default;

    void accept (int& client_conn_fd, sockaddr& addr) const {
      Logger::error(DEBUG, {{ MSG, "waiting for connection..." }});

      socklen_t addrlen = sizeof(addr);
      client_conn_fd = accept4(this->socket_fd._fd, &addr, &addrlen, SOCK_CLOEXEC);

      if (client_conn_fd < 0) {
        throw Error(OSERR, "accept: " + std::string(std::strerror(errno)), errno);
      }
    }

    void run () {
      Logger::error(DEBUG, {});

      const AddrinfoRes addrinfo_results(Config::config["host"].GetString(), std::to_string(Config::config["port"].GetInt()));

      std::string bind_err_msgs = "bind: ";

      for (addrinfo* res = addrinfo_results.addrinfo_res; res != nullptr; res = res->ai_next) {
        if (bind(this->socket_fd._fd, res->ai_addr, res->ai_addrlen) < 0) {
          bind_err_msgs += std::string(std::strerror(errno)) + "; ";

          if(res->ai_next == nullptr) {
            throw Error(OSERR, bind_err_msgs, errno);
          }
        } else {
          break;
        }
      }

      if (listen(this->socket_fd._fd, Config::config["backlog"].GetInt()) < 0) {
        throw Error(OSERR, "listen: " + std::string(std::strerror(errno)), errno);
      }

      Logger::error(INFO, {{ MSG, "Listening on " + std::to_string(Config::config["port"].GetInt()) }});

      constexpr int max_consecutive_failed = 1000;
      int failed = 0;

      while (true) {
        if (failed >= max_consecutive_failed) {
          throw Error(OSERR, "reached max consecutive failed accepts and forks", errno);
        }

        try {
          int client_socket_fd = -1;
          sockaddr addr {};

          this->accept(client_socket_fd, addr);

          const pid_t pid = fork();

          if (pid == 0) { // child process
            try {
              Logger::error(DEBUG, {{ MSG, "connection accepted" }});

              this->socket_fd = FileDescriptor {}; // closing parent socket

              ClientConnection client_conn(client_socket_fd, addr);
              client_conn.receive_meta();

              if (client_conn.state == RECEIVING) {
                client_conn.serve_static_file(client_conn.req_meta.path);
              }

              try {
                client_conn.shutdown();
              } catch (const Error& err) {
                if (err._type == CLIENTERR) {
                  Logger::error(DEBUG, {{ MSG, "client already disconnected" }});
                } else {
                  throw;
                }
              }
            } catch (const std::exception& err) {
              Logger::error(ERROR, {{ MSG, err.what() }});
              std::exit(EXIT_FAILURE);
            }

            std::exit(EXIT_SUCCESS);
          } else if (pid > 0) { // parent process
            if (close(client_socket_fd) < 0) {
              Logger::error(ERROR, {{ MSG, "close: " + std::string(std::strerror(errno)) }});
            }

            Logger::error(DEBUG, {
              { MSG, "child forked" },
              { VAR_NAME, "pid" },
              { VAR_VALUE, std::to_string(pid) }
            });

            failed = 0;
          } else {
            Logger::error(ERROR, {{ MSG, "fork: " + std::string(std::strerror(errno)) }});

            failed++;
          }
        } catch (const Error& err) {
          // if part handles common accept errors
          if (err._errno == EAGAIN || err._errno == EWOULDBLOCK || err._errno == EINTR) {
            Logger::error(DEBUG, {{ MSG, err.what() }});
          } else {
            Logger::error(ERROR, {{ MSG, err.what() }});
          }

          failed++;
        }
      }
    }
};

#endif
