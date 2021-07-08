(function ($) {
  $.fn.autocomplete = function (data) {
    return this.each(function () {
      const airportNames = Object.keys(data).sort();
      const $dataList = $('<datalist></dataList>')
        .attr('id', $(this).attr('list'))
        .insertAfter($(this));

      const onChange = (data) => (event) => {
        const newVal = $(this).val();

        const minCharacters = 1;
        const maxSuggestions = 20;

        if (newVal.length < minCharacters) {
          return;
        }

        $dataList.empty();
        let suggestionsCount = 0;

        for (const airportName of data) {
          if (suggestionsCount === maxSuggestions) {
            break;
          }

          if (airportName.toLowerCase().indexOf(newVal.toLowerCase()) !== -1) {
            suggestionsCount += 1;

            $(`<option></option>`)
              .attr('value', data)
              .appendTo($dataList);
          }
        }
      };

      $(this).on('keyup', onChange(airportNames));
    });
  };
})(jQuery);
