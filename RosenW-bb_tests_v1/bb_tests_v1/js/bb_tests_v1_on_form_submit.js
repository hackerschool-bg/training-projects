let submitted = false;

if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}

function checkBeforeSubmit(){
    if(!submitted) {
        submitted = true;
        return submitted;
    }
    return false;
} 