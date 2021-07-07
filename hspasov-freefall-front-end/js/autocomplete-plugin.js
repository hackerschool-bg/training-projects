(function ($) {
  $.fn.autocomplete = function (data) {
    return this.each(function () {
      const $dataList = $('<datalist></dataList>')
        .attr('id', $(this).attr('list'))
        .insertAfter($(this));

      const onInput = (data) => (event) => {
        const newVal = $(this).val();

        const minCharacters = 1;
        const maxSuggestions = 20;

        if (newVal.length < minCharacters) {
          return;
        }

        $dataList.empty();
        let suggestionsCount = 0;

        for (const value of data) {
          if (suggestionsCount === maxSuggestions) {
            break;
          }

          if (value.toLowerCase().indexOf(newVal.toLowerCase()) !== -1) {
            suggestionsCount += 1;

            $(`<option></option>`)
              .attr('value', value)
              .appendTo($dataList);
          }
        }
      };

      $(this).on('input', onInput(Object.keys(data).sort()));
    });
  };
})(jQuery);
