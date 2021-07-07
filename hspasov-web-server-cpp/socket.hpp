#ifndef SOCKET_HPP
#define SOCKET_HPP

#include "file_descriptor.hpp"
#include "config.hpp"
#include "error.hpp"
#include "logger.hpp"
#include <cerrno>
#include <iostream>
#include <sys/socket.h>
#include <unistd.h>

class Socket {
  protected:
    FileDescriptor _fd;

  public:
    std::unique_ptr<char[]> recv_buffer;
    std::unique_ptr<char[]> send_buffer;
    ssize_t bytes_received_amount;

    explicit Socket (const int fd)
      : _fd(FileDescriptor(fd)),
        recv_buffer(std::make_unique<char[]>(Config::config["recv_buffer"].GetInt())),
        send_buffer(std::make_unique<char[]>(Config::config["send_buffer"].GetInt())),
        bytes_received_amount(0) {

      Logger::error(DEBUG, {});

      timeval recv_timeout {};
      recv_timeout.tv_sec = Config::config["socket_recv_timeout"].GetInt();
      recv_timeout.tv_usec = 0;

      if (setsockopt(this->_fd._fd, SOL_SOCKET, SO_RCVTIMEO, &recv_timeout, sizeof(recv_timeout)) < 0) {
        throw Error(OSERR, "setsockopt: " + std::string(std::strerror(errno)), errno);
      }

      timeval send_timeout {};
      send_timeout.tv_sec = Config::config["socket_send_timeout"].GetInt();
      send_timeout.tv_usec = 0;

      if (setsockopt(this->_fd._fd, SOL_SOCKET, SO_SNDTIMEO, &send_timeout, sizeof(send_timeout)) < 0) {
        throw Error(OSERR, "setsockopt: " + std::string(std::strerror(errno)), errno);
      }
    }

    Socket (const Socket& socket)
      : recv_buffer(std::make_unique<char[]>(Config::config["recv_buffer"].GetInt())),
        send_buffer(std::make_unique<char[]>(Config::config["send_buffer"].GetInt())),
        bytes_received_amount(socket.bytes_received_amount) {

      Logger::error(DEBUG, {});

      const int fd = fcntl(socket._fd._fd, F_DUPFD_CLOEXEC, 0);

      if (fd < 0) {
        throw Error(OSERR, "fcntl: " + std::string(std::strerror(errno)), errno);
      }

      this->_fd = FileDescriptor(fd);

      for (int i = 0; i < Config::config["recv_buffer"].GetInt(); i++) {
        this->recv_buffer[i] = socket.recv_buffer[i];
      }

      for (int i = 0; i < Config::config["send_buffer"].GetInt(); i++) {
        this->send_buffer[i] = socket.send_buffer[i];
      }
    }

    Socket& operator= (const Socket& socket) {
      Logger::error(DEBUG, {});

      const int fd = fcntl(socket._fd._fd, F_DUPFD_CLOEXEC, 0);

      if (fd < 0) {
        throw Error(OSERR, "fcntl: " + std::string(std::strerror(errno)), errno);
      }

      this->_fd = FileDescriptor(fd);
      this->bytes_received_amount = socket.bytes_received_amount;

      for (int i = 0; i < Config::config["recv_buffer"].GetInt(); i++) {
        this->recv_buffer[i] = socket.recv_buffer[i];
      }

      for (int i = 0; i < Config::config["send_buffer"].GetInt(); i++) {
        this->send_buffer[i] = socket.send_buffer[i];
      }

      return *this;
    }

    Socket (Socket&&) = default;
    Socket& operator= (Socket&&) = default;
    ~Socket() = default;

    void shutdown () const {
      Logger::error(DEBUG, {});

      if (::shutdown(this->_fd._fd, SHUT_RDWR) < 0) {
        std::string err_msg = "shutdown: " + std::string(std::strerror(errno));

        if (errno == ENOTCONN) {
          throw Error(CLIENTERR, err_msg);
        }

        throw Error(OSERR, err_msg);
      }
    }

    int send (const std::string& data) const {
      // TODO optimize
      Logger::error(DEBUG, {});

      int packages_sent = 0;
      int zero_sends = 0;
      constexpr int max_consecutive_zero_sends = 20;
      constexpr int no_flags = 0;
      unsigned total_bytes_sent = 0;

      std::string remaining_data(data);

      while (total_bytes_sent < data.size()) {
        if (zero_sends >= max_consecutive_zero_sends) {
          throw Error(OSERR, "max_consecutive_zero_sends reached", errno);
        }

        const std::string data_to_send(remaining_data, 0, Config::config["send_buffer"].GetInt());

        data_to_send.copy(this->send_buffer.get(), data_to_send.size(), 0);

        const ssize_t bytes_sent = ::send(this->_fd._fd, this->send_buffer.get(), data_to_send.size(), no_flags);

        if (bytes_sent < 0) {
          // if send timeouts, end handling this request, nothing else can be done
          throw Error(OSERR, "send: " + std::string(std::strerror(errno)), errno);
        }

        if (bytes_sent == 0) {
          zero_sends++;
        } else {
          zero_sends = 0;
        }

        packages_sent++;
        total_bytes_sent += bytes_sent;
        remaining_data.erase(0, bytes_sent);
      }

      Logger::error(DEBUG, {
        { VAR_NAME, "data" },
        { VAR_VALUE, data },
        { MSG, "successfully sent " + std::to_string(total_bytes_sent) }
      });

      return packages_sent;
    }

    void receive () {
      Logger::error(DEBUG, {});

      constexpr int no_flags = 0;

      this->bytes_received_amount = recv(this->_fd._fd, this->recv_buffer.get(), Config::config["recv_buffer"].GetInt(), no_flags);

      if (this->bytes_received_amount < 0) {
        std::string err_msg = "recv: " + std::string(std::strerror(errno));

        if (errno == EAGAIN || errno == EWOULDBLOCK) {
          throw Error(CLIENTERR, err_msg);
        }

        Logger::error(ERROR, {{ MSG, err_msg }});

        throw Error(OSERR, err_msg);
      }
    }
};

#endif
