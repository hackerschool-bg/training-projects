#ifndef FILE_DESCRIPTOR_HPP
#define FILE_DESCRIPTOR_HPP

#include "error.hpp"
#include <cerrno>
#include <cstring>
#include <unistd.h>
#include <fcntl.h>

struct FileDescriptor {
  static constexpr int uninitialized = -1;

  static bool is_fd_open (const int fd) {
    return fcntl(fd, F_GETFD, 0) != -1 || errno != EBADF;
  }

  int _fd;

  explicit FileDescriptor (const int fd) {
    if (!FileDescriptor::is_fd_open(fd)) {
      throw Error(APPERR, "initializing FileDescriptor with closed or invalid file descriptor", errno);
    }

    this->_fd = fd;
  }

  FileDescriptor ()
    : _fd(FileDescriptor::uninitialized) {}

  FileDescriptor (FileDescriptor&& other) noexcept {
    this->_fd = other._fd;
    other._fd = FileDescriptor::uninitialized;
  }

  FileDescriptor& operator= (FileDescriptor&& other) noexcept {
    this->_fd = other._fd;
    other._fd = FileDescriptor::uninitialized;

    return *this;
  }

  FileDescriptor (const FileDescriptor&) = delete;
  FileDescriptor& operator= (const FileDescriptor&) = delete;

  ~FileDescriptor () {
    if (this->_fd != FileDescriptor::uninitialized && close(this->_fd) < 0) {
      // FileDescriptor is included in Logger
      // can't include logger in FileDescriptor
      // therefore logging with cerr
      std::cerr << "ERROR: close: " << std::string(std::strerror(errno)) << std::endl;
    }
  }
};

#endif
