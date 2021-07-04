let submitted = false;

if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}

const duplicates = ['link', 'real-name', 'email', 'date-from', 'date-to'];
for (const dup of duplicates) {
    if (document.getElementById(dup).value) {
        document.getElementById(dup + '-dup').value = document.getElementById(dup).value;
    }
    document.getElementById(dup).addEventListener("input", function (e) {
        document.getElementById(dup + '-dup').value = this.value;
    });
}

for (const dup of duplicates) {
    if (document.getElementById(dup + '-dup').value) {
        document.getElementById(dup).value = document.getElementById(dup + '-dup').value;
    }
}

Date.prototype.addDays = function(days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

if (!document.getElementById('date-from').valueAsDate) {
    document.getElementById('date-from').valueAsDate = new Date();
}

if (!document.getElementById('date-to').valueAsDate) {
    document.getElementById('date-to').valueAsDate = new Date().addDays(2);
}

function checkBeforeSubmit () {
    if (!submitted) {
        submitted = true;
        return submitted;
    }
    return false;
} 

function showHints () {
    document.getElementById('hints-label').style.display = "inline-block";
    document.getElementById('hints-textarea').valueAsDate = "block";
}