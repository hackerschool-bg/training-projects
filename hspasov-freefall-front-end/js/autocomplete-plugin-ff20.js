(function ($) {
  $.fn.autocomplete = function (data) {
    return this.each(function () {
      const $dataList = $('<datalist></dataList>')
        .attr('id', $(this).attr('list'))
        .insertAfter($(this));

      const onInput = function (data) {
        return function (event) {
          const newVal = $(this).val();

          const minCharacters = 1;
          const maxSuggestions = 20;

          if (newVal.length < minCharacters) {
            return;
          }

          $dataList.empty();
          var suggestionsCount = 0; // eslint-disable-line no-var

          var i; // eslint-disable-line no-var
          for (i = 0; i < data.length; i++) {
            if (suggestionsCount === maxSuggestions) {
              break;
            }

            if (data[i].toLowerCase().indexOf(newVal.toLowerCase()) !== -1) {
              suggestionsCount += 1;

              $('<option></option>')
                .attr('value', data[i])
                .appendTo($dataList);
            }
          }
        };
      };

      $(this).on('input', onInput(data));
    });
  };
})(jQuery);
