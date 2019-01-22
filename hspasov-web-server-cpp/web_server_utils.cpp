#include <string>
#include <fcntl.h>
#include <unistd.h>
#include <cerrno>
#include <ctime>
#include <cstring>
#include <iostream>
#include <sys/time.h>
#include "logger.hh"
#include "error_log_fields.hh"

namespace web_server_utils {

  std::string read_text_file (const char* const file_path) {
    // TODO add file size limit assert

    const int fd = open(file_path, O_RDONLY);

    if (fd < 0) {
      error_log_fields fields = { ERROR };
      fields.msg = "open errno: " + errno;
      Logger::error(fields);
      exit(-1);
      // TODO throw
    }

    std::string file_content;

    while (true) {
      const int buff_size = 10;
      char buffer[buff_size];
      const ssize_t bytes_read_amount = read(fd, buffer, buff_size);

      if (bytes_read_amount == 0) {
        break;
      } else if (bytes_read_amount < 0) {
        error_log_fields fields = { ERROR };
        fields.msg = "read errno: " + errno;
        Logger::error(fields);
        exit(-1); // TODO maybe throw?
      } else {
        file_content.append(buffer, bytes_read_amount);
      }
    }

    if (close(fd) < 0) {
      error_log_fields fields = { ERROR };
      fields.msg = "close errno: " + errno;
      Logger::error(fields);
      // TODO throw
    }

    return file_content;
  }

  void text_file_write (const int fd, const std::string content) {
    // TODO put buff size in config
    const int buff_size = 1024;
    unsigned total_amount_bytes_written = 0;
    std::string content_to_write(content);

    while (total_amount_bytes_written < content.length()) {
      const std::string content_to_write = content.substr(total_amount_bytes_written, buff_size);
      const int bytes_written_amount = write(fd, content_to_write.c_str(), content_to_write.length());

      if (bytes_written_amount < 0) {
        error_log_fields fields = { ERROR };
        fields.msg = "write errno: " + errno;
        Logger::error(fields);
        // TODO throw
      }

      total_amount_bytes_written += bytes_written_amount;
    }
  }

  bool is_fd_open (const int fd) {
    return fcntl(fd, F_GETFD) != -1 || errno != EBADF;
  }

  std::string get_current_time () {
    const int time_str_max_chars = 20;
    char time_str[time_str_max_chars];
    timeval time;

    gettimeofday(&time, nullptr);

    tm* timeinfo = std::localtime(&time.tv_sec);
    strftime(time_str, time_str_max_chars, "%Y-%m-%d %H:%M:%S", timeinfo);

    std::string result_str(time_str);
    result_str.append(".");
    result_str.append(std::to_string(time.tv_usec));

    return result_str;
  }

}
