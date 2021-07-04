Date.prototype.addDays = function(days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

document.getElementById('date-from').valueAsDate = new Date();
document.getElementById('date-to').valueAsDate = new Date().addDays(2);