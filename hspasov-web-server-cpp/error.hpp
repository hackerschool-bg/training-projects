#ifndef ERROR_HPP
#define ERROR_HPP

#include <iostream>
#include <string>

enum error_type {
  OSERR,
  CLIENTERR,
  SERVERERR,
  APPERR,
};

class Error: public std::exception {
  public:
    const std::string what_arg;
    const error_type _type;
    int _errno;

    Error(const error_type type, const std::string& msg, const int errno_code = 0)
      : what_arg(msg), _type(type), _errno(errno_code) {}

    const char* what() const noexcept override {
      return this->what_arg.c_str();
    }
};

#endif
