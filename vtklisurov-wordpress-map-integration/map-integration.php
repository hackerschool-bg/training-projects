<?php
/**
 * Plugin Name: Map Integration
 * Plugin URI: http://localhost/map-integration
 * Description: How do i do any of this
 * Version: 1.0
 * Author: Velin
 * Author URI: http://localhost/
 */

add_filter('the_content', 'displayHTMLpage' );

function displayHTMLpage() 
{
   $post_id=get_the_ID();
   if($post_id==1)
   {   
      if (is_single(1))
	{
          $asubHTML = file_get_contents(plugins_url('/wp_map.html',__FILE__ ));
          return $content . $asubHTML;
	}
   }
   if($post_id==63)
   {   
      $asubHTML = file_get_contents(plugins_url('/wp_10k.html',__FILE__ ));
      return $content . $asubHTML;
   }
}
?>
