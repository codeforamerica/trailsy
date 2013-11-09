$(document).ready(function() {
    // Collapsible Menu
    function accordion(e) {
        //variables
        var $trigger = $(e), //trigger firing the event
            visible = $trigger.hasClass('active'); //flag for wayfinding

            $trigger.hover().css({'cursor': 'pointer'});

      if(visible) $trigger.children('.icon').html('&nbsp;&#x25B2;');
      else $trigger.children('.icon').html('&nbsp;&#x25BC;');

        //event
        $trigger.click(function() {
            console.log("ACCORDION")
            //conditional check
            if ( visible ) {
                //  if visible is false...remove 'active' class
                $trigger.removeClass('active');
                //  ...and add the down triangle
                //  ...to the child of 'this' which is....the trigger
                $(this).children('.icon').html('&nbsp;&#x25BC;');

                //  Find 'panel-content' as a parent of the h4
                $(this).parent().find('.panel-content').slideUp('fast',function() {
                    $(this).addClass('visuallyhidden').slideDown(0);
                    $('.panel-content').attr( 'aria-expanded','false' );
                });
            } else {
                $trigger.addClass('active');
                $(this).children('.icon').html('&nbsp;&#x25B2;');

                $(this).parent().find('.panel-content').slideUp(0,function() {
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
    accordion('.trigger1'),
    //call to widget trigger2
    accordion('.trigger2');
    accordion('.trigger3');
    accordion('.triggerAbout');
  
});//end document.ready()


