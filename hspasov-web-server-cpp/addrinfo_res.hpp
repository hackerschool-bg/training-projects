#ifndef ADDRINFO_RES_HPP
#define ADDRINFO_RES_HPP

#include "error.hpp"
#include "logger.hpp"
#include <cerrno>
#include <cstring>
#include <string>
#include <netdb.h>
#include <sys/socket.h>

class AddrinfoRes {
  public:
    addrinfo* addrinfo_res;

    AddrinfoRes(const std::string& hostname, const std::string& service) {
      Logger::error(DEBUG, {});

      addrinfo hints {};
      hints.ai_family = AF_INET;
      hints.ai_socktype = SOCK_STREAM;

      const int getaddrinfo_result = getaddrinfo(hostname.c_str(), service.c_str(), &hints, &this->addrinfo_res);

      if (getaddrinfo_result != 0) {
        std::string err_msg;

        if (getaddrinfo_result == EAI_SYSTEM) {
          err_msg = std::string(std::strerror(errno));
        } else {
          err_msg = std::string(gai_strerror(getaddrinfo_result));
        }

        freeaddrinfo(this->addrinfo_res);
        throw Error(SERVERERR, err_msg);
      }
    }

    AddrinfoRes (const AddrinfoRes&) = delete;
    AddrinfoRes (AddrinfoRes&&) = delete;
    AddrinfoRes& operator= (const AddrinfoRes&) = delete;
    AddrinfoRes& operator= (AddrinfoRes&&) = delete;

    ~AddrinfoRes() {
      Logger::error(DEBUG, {});

      freeaddrinfo(this->addrinfo_res);
    }
};

#endif
