#ifndef WEB_SERVER_UTILS_HPP
#define WEB_SERVER_UTILS_HPP

#include <string>
#include <regex>
#include <vector>
#include <cerrno>
#include <curl/curl.h>
#include "error.hpp"
#include "config.hpp"

namespace web_server_utils {

  inline std::string get_current_time () {
    constexpr int time_str_max_chars = 20;
    char time_str[time_str_max_chars];
    timeval time {};

    gettimeofday(&time, nullptr);

    strftime(static_cast<char*>(time_str), time_str_max_chars, "%Y-%m-%d %H:%M:%S", std::localtime(&time.tv_sec));

    std::string result_str(static_cast<char*>(time_str));
    result_str.append(".");
    result_str.append(std::to_string(time.tv_usec));

    return result_str;
  }

  inline std::vector<std::string> split(const std::string& str, const std::regex& delimiter_pattern, const bool excl_empty_tokens = false) {
    if (!excl_empty_tokens) {
      throw Error(APPERR, "incl empty tokens NOT IMPLEMENTED");
    }

    std::vector<std::string> result;

    std::regex_token_iterator<std::string::const_iterator> token_iter(str.cbegin(), str.cend(), delimiter_pattern, -1);
    std::regex_token_iterator<std::string::const_iterator> end;

    while (token_iter != end) {
      if ((*token_iter).length() > 0) {
        result.push_back(*token_iter);
      }

      token_iter++;
    }

    return result;
  }

  inline std::string ascii_letters_to_upper (const std::string& str) {
    constexpr int ascci_letter_case_diff = 'a' - 'A';
    std::string result;

    for (char character : str) {
      if (character >= 'a' && character <= 'z') {
        result += static_cast<char>(character - ascci_letter_case_diff);
      } else {
        result += character;
      }
    }

    return result;
  }

  inline std::string trim (const std::string& str) {
    const std::regex leading_whitespace_pattern("^\\s*");
    const std::regex trailing_whitespace_pattern("\\s*$");

    std::string leading_trimmed = std::regex_replace(str, leading_whitespace_pattern, "");

    return std::regex_replace(leading_trimmed, trailing_whitespace_pattern, "");
  }

  inline std::string url_unescape (const std::string& str) {
    CURL *handle = curl_easy_init();

    int unescaped_length;
    char* unescaped_raw = curl_easy_unescape(handle, str.c_str(), str.size(), &unescaped_length);

    std::string unescaped(unescaped_raw, unescaped_length);

    curl_free(unescaped_raw);
    curl_easy_cleanup(handle);

    return unescaped;
  }

  inline std::string join (const std::vector<std::string>& tokens, const std::string& separator) {
    std::string result;

    for (auto it = tokens.cbegin(); it != tokens.cend(); ++it) {
      if (it != tokens.cbegin()) {
        result += separator;
      }

      result += *it;
    }

    return result;
  }

  inline std::string resolve_static_file_path (const std::string& path) {
    constexpr bool split_excl_empty_tokens = true;
    const std::regex forw_slash_regex("/");
    const std::vector<std::string> root_path_split = web_server_utils::split(
      Config::config["web_server_root"].GetString(),
      forw_slash_regex,
      split_excl_empty_tokens
    );
    const std::vector<std::string> document_root_path_split = web_server_utils::split (
      Config::config["document_root"].GetString(),
      forw_slash_regex,
      split_excl_empty_tokens
    );
    const std::vector<std::string> path_split = web_server_utils::split(path, forw_slash_regex, split_excl_empty_tokens);

    std::string result;

    std::vector<std::string> resolved_split;
    resolved_split.reserve(root_path_split.size() + document_root_path_split.size() + path_split.size());

    resolved_split.insert(resolved_split.end(), root_path_split.cbegin(), root_path_split.cend());
    resolved_split.insert(resolved_split.end(), document_root_path_split.cbegin(), document_root_path_split.cend());
    resolved_split.insert(resolved_split.end(), path_split.cbegin(), path_split.cend());

    result.append("/");
    result.append(web_server_utils::join(resolved_split, "/"));

    return result;
  }

  inline std::string stringify_headers (const std::map<const std::string, const std::string>& headers) {
    std::string stringified;

    for (auto header_field : headers) {
      stringified += header_field.first;
      stringified += ": ";
      stringified += header_field.second;
      stringified += "; ";
    }

    return stringified;
  }

} // end namespace web_server_utils

#endif
