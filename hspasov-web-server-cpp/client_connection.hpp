#ifndef CLIENT_CONNECTION_HPP
#define CLIENT_CONNECTION_HPP

#include "config.hpp"
#include "content_reader.hpp"
#include "http_msg_formatter.hpp"
#include "logger.hpp"
#include "socket.hpp"
#include <numeric>
#include <iostream>
#include <string>
#include <sys/stat.h>
#include <arpa/inet.h>

enum client_conn_state {
  ESTABLISHED,
  RECEIVING,
  SENDING,
  SHUTDOWN,
  CLOSED
};

class ClientConnection {
  protected:
    Socket conn;
    std::string req_meta_raw;
  public:
    std::string remote_addr;
    unsigned short remote_port;
    request_meta req_meta;
    response_meta res_meta;
    client_conn_state state;

    explicit ClientConnection (const int conn, sockaddr& addr)
      : conn(Socket(conn)), state(ESTABLISHED) {

      Logger::error(DEBUG, {});

      char remote_addr_buffer[INET_ADDRSTRLEN];

      // https://en.wikipedia.org/wiki/Type_punning#Sockets_example

      auto addr_in = reinterpret_cast<sockaddr_in*>(&addr);

      if (inet_ntop(AF_INET, &(addr_in->sin_addr), static_cast<char*>(remote_addr_buffer), INET_ADDRSTRLEN) == nullptr) {
        throw Error(OSERR, "inet_ntop: " + std::string(std::strerror(errno)), errno);
      }

      this->remote_addr = std::string(static_cast<char*>(remote_addr_buffer));
      this->remote_port = htons(addr_in->sin_port);

      Logger::init_access_log();
    }

    ClientConnection (const ClientConnection&) = delete;
    ClientConnection (ClientConnection&&) = delete;
    ClientConnection& operator= (const ClientConnection&) = delete;
    ClientConnection& operator= (ClientConnection&&) = delete;

    ~ClientConnection () {
      Logger::error(DEBUG, {});

      try {
        access_log_fields fields {};
        fields.remote_addr = this->remote_addr;
        fields.req_line = this->req_meta.req_line_raw;
        fields.user_agent = this->req_meta.user_agent;
        fields.status_code = this->res_meta.status_code;

        if (this->res_meta.headers.find("Content-Length") != this->res_meta.headers.cend()) {
          fields.content_length = this->res_meta.headers.at("Content-Length");
        }

        Logger::access(fields);
      } catch (const std::exception& err) {
        Logger::error(ERROR, {{ MSG, err.what() }});
      }
    }

    void receive_meta () {
      Logger::error(DEBUG, {});

      this->state = RECEIVING;

      while (true) {
        if (this->req_meta_raw.size() > Config::config["req_meta_limit"].GetUint()) {
          this->send_meta(400);
          return;
        }

        Logger::error(DEBUG, {{ MSG, "receiving data..." }});

        try {
          this->conn.receive();
        } catch (const Error& err) {
          if (err._type == CLIENTERR) {
            this->send_meta(408);
            return;
          }

          throw;
        }

        this->req_meta_raw.append(this->conn.recv_buffer.get(), this->conn.bytes_received_amount);

        if (this->conn.bytes_received_amount == 0) {
          Logger::error(DEBUG, {{ MSG, "connection closed by peer" }});

          this->state = CLOSED;
          return;
        }

        const size_t double_crlf_pos = this->req_meta_raw.find("\r\n\r\n", 0);

        if (double_crlf_pos != std::string::npos) {
          Logger::error(DEBUG, {{ MSG, "reached end of request meta" }});

          std::string body_beg = this->req_meta_raw.substr(double_crlf_pos, std::string::npos);
          body_beg.erase(0, 4); // remove CR-LF-CR-LF at the beginning
          body_beg.copy(this->conn.recv_buffer.get(), body_beg.size(), 0);
          this->conn.bytes_received_amount = body_beg.size();

          this->req_meta_raw = this->req_meta_raw.substr(0, double_crlf_pos);

          break;
        }
      }

      Logger::error(DEBUG, {{ MSG, this->req_meta_raw }});
      Logger::error(DEBUG, {{ MSG, "Parsing request msg.." }});

      try {
        this->req_meta = http_msg_formatter::parse_req_meta(this->req_meta_raw);
      } catch (const Error& err) {
        if (err._type == CLIENTERR) {
          this->send_meta(400);
          return;
        }

        throw;
      }

      Logger::error(DEBUG, {{ MSG, this->req_meta.to_string() }});
    }

    void serve_static_file (const std::string& path) {
      Logger::error(DEBUG, {
        { VAR_NAME, "path" },
        { VAR_VALUE, web_server_utils::resolve_static_file_path(path) }
      });

      try {
        ContentReader reader(path);

        std::map<const std::string, const std::string> headers;
        headers.insert(std::pair<const std::string, const std::string>("Content-Length", std::to_string(reader.file_size)));

        this->send_meta(200, headers);

        while (true) {
          const ssize_t bytes_read = reader.read();

          if (bytes_read == 0) {
            Logger::error(DEBUG, {{ MSG, "end of file reached while reading" }});

            break;
          }

          const std::string data(reader.buffer.get(), bytes_read);

          const int packages_sent = this->conn.send(data);

          this->res_meta.packages_sent += packages_sent;
        }
      } catch (const Error& err) {
        if (err._type == CLIENTERR) {
          this->send_meta(404);
          return;
        }

        throw;
      }
    }

    void send_meta (const int status_code, const std::map<const std::string, const std::string>& headers = std::map<const std::string, const std::string>()) {
      Logger::error(DEBUG, {
        { VAR_NAME, "status_code" },
        { VAR_VALUE, std::to_string(status_code) },
      });

      Logger::error(DEBUG, {
        { VAR_NAME, "headers" },
        { VAR_VALUE, web_server_utils::stringify_headers(headers) },
      });

      assert(http_msg_formatter::response_reason_phrases.find(status_code) != http_msg_formatter::response_reason_phrases.cend());

      this->state = SENDING;

      response_meta res_meta {};
      res_meta.status_code = std::to_string(status_code);
      res_meta.headers = headers;
      res_meta.packages_sent = 0;

      this->res_meta = res_meta;

      std::string res_meta_msg = http_msg_formatter::build_res_meta(status_code, headers, "");

      const int packages_sent = this->conn.send(res_meta_msg);

      this->res_meta.packages_sent += packages_sent;
    }

    void shutdown () {
      this->conn.shutdown();
    }
};

#endif
