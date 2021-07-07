#ifndef FILE_READER_HPP
#define FILE_READER_HPP

#include "file_descriptor.hpp"
#include "web_server_utils.hpp"
#include "error.hpp"
#include "logger.hpp"
#include "config.hpp"
#include <cerrno>
#include <sys/stat.h>
#include <fcntl.h>

class ContentReader {
  protected:
    FileDescriptor _fd;

  public:
    size_t file_size;
    std::unique_ptr<char[]> buffer;

    explicit ContentReader (const std::string& file_path)
      : buffer(std::make_unique<char[]>(Config::config["read_buffer"].GetInt())) {

      Logger::error(DEBUG, {});

      const int fd = open(web_server_utils::resolve_static_file_path(file_path).c_str(), O_RDONLY | O_CLOEXEC, 0);

      if (fd < 0) {
        std::string err_msg = "open: " + std::string(std::strerror(errno));

        if (errno == EISDIR || errno == ENOENT) {
          throw Error(CLIENTERR, err_msg, errno);
        }

        throw Error(OSERR, err_msg, errno);
      }

      this->_fd = FileDescriptor(fd);

      struct stat statbuf {};

      if (fstat(this->_fd._fd, &statbuf) < 0) {
        throw Error(OSERR, "fstat: " + std::string(std::strerror(errno)), errno);
      }

      // check whether it is not regular file
      if (!S_ISREG(statbuf.st_mode)) {
        throw Error(CLIENTERR, "requested file is not regular");
      }

      this->file_size = statbuf.st_size;
    }

    ContentReader (const ContentReader& reader)
      : buffer(std::make_unique<char[]>(Config::config["read_buffer"].GetInt())) {

      Logger::error(DEBUG, {});

      // read position is preserved
      const int fd = fcntl(reader._fd._fd, F_DUPFD_CLOEXEC, 0);

      if (fd < 0) {
        throw Error(OSERR, "fcntl: " + std::string(std::strerror(errno)), errno);
      }

      this->_fd = FileDescriptor(fd);

      for (int i = 0; i < Config::config["read_buffer"].GetInt(); i++) {
        this->buffer[i] = reader.buffer[i];
      }

      this->file_size = reader.file_size;
    }

    ContentReader& operator= (const ContentReader& reader) {
      Logger::error(DEBUG, {});

      const int fd = fcntl(reader._fd._fd, F_DUPFD_CLOEXEC, 0);

      if (fd < 0) {
        throw Error(OSERR, "fcntl: " + std::string(std::strerror(errno)), errno);
      }

      this->_fd = FileDescriptor(fd);
      this->file_size = reader.file_size;

      for (int i = 0; i < Config::config["read_buffer"].GetInt(); i++) {
        this->buffer[i] = reader.buffer[i];
      }

      return *this;
    }

    ContentReader (ContentReader&&) = default;
    ContentReader& operator= (ContentReader&&) = default;
    ~ContentReader() = default;

    size_t read () {
      Logger::error(DEBUG, {});

      const ssize_t bytes_read = ::read(this->_fd._fd, this->buffer.get(), Config::config["read_buffer"].GetInt());

      if (bytes_read < 0) {
        throw Error(OSERR, "read: " + std::string(std::strerror(errno)), errno);
      }

      return bytes_read;
    }
};

#endif
