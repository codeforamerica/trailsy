$(document).ready(function() {
    // Collapsible Menu
    function accordion(trigger) {
        //variables
        var $button = $(trigger), //trigger firing the event
            visible = true; //flag for wayfinding

            $button.hover().css({'cursor': 'pointer'});

        //event
        $button.click(function() {
            //conditional check
            if ( ! visible ) {
                $button.removeClass('active');
                $('.panel-title .icon').html('&oplus;');


                $(this).next().slideUp('fast',function() {
                    $(this).addClass('visuallyhidden').slideDown(0);
                    $('.panel-content').attr( 'aria-expanded','false' );
                });
            }else {
                $button.addClass('active');
                $('.panel-title.active .icon').html('&otimes;');

                $(this).next().slideUp(0,function() {
                    $('.panel-content').attr( 'aria-expanded','true' );
                    $(this).removeClass('visuallyhidden').slideDown('fast');
                });
            }

            //flag dude
            visible = !visible;
            return false;
        });
    }

    //call to widget trigger1
    accordion('#trigger1');
    //call to widget trigger2
    accordion('#trigger2');
    accordion('#trigger3');

});//end document.ready()