#ifndef CONFIG_HPP
#define CONFIG_HPP

#include "rapidjson/stringbuffer.h"
#include "rapidjson/schema.h"
#include "rapidjson/document.h"
#include "error.hpp"
#include "file_descriptor.hpp"
#include <iostream>
#include <cerrno>
#include <fcntl.h>
#include <unistd.h>

class Config {
  public:
    static rapidjson::Document config;

    static void init_config (const std::string& config_file) {
      const std::string config_file_schema_path = "./config_schema.json";
      rapidjson::Document config_schema_document;

      const std::string config_schema_raw = Config::read_config_file(config_file_schema_path);

      if (config_schema_document.Parse(config_schema_raw.c_str()).HasParseError()) {
        std::cerr << config_file_schema_path << ": JSON parsing error" << std::endl;
        exit(-1);
      }

      const rapidjson::SchemaDocument config_schema(config_schema_document);
      rapidjson::SchemaValidator config_schema_validator(config_schema);

      const std::string config_raw = Config::read_config_file(config_file);

      if (Config::config.Parse(config_raw.c_str()).HasParseError()) {
        std::cerr << config_file << ": JSON parsing error" << std::endl;
        exit(-1);
      }

      if (!Config::config.Accept(config_schema_validator)) {
        std::cerr << "config validation error: " << Config::get_validation_error(&config_schema_validator) << std::endl;
        exit(-1);
      }
    }

    static std::string read_config_file (const std::string& file_path) {
      const int fd = open(file_path.c_str(), O_RDONLY | O_CLOEXEC, 0);

      if (fd < 0) {
        if (errno == ENOENT) {
          throw Error(SERVERERR, file_path + ": file not found");
        }

        throw Error(OSERR, "open: " + std::string(std::strerror(errno)), errno);
      }

      FileDescriptor config_file_fd(fd);

      std::string file_content;

      while (true) {
        constexpr int buff_size = 10;
        char buffer[buff_size];
        const ssize_t bytes_read_amount = read(config_file_fd._fd, static_cast<char*>(buffer), buff_size);

        if (bytes_read_amount == 0) {
          break;
        }

        if (bytes_read_amount < 0) {
          throw Error(OSERR, "read: " + std::string(std::strerror(errno)), errno);
        }

        file_content.append(static_cast<char*>(buffer), bytes_read_amount);
      }

      return file_content;
    }

    static std::string get_validation_error (rapidjson::SchemaValidator* validator) {
      std::string result;
      rapidjson::StringBuffer buffer;

      validator->GetInvalidSchemaPointer().StringifyUriFragment(buffer);

      result += buffer.GetString();
      result += "/";
      result += validator->GetInvalidSchemaKeyword();

      buffer.Clear();
      return result;
    }
};

#endif
