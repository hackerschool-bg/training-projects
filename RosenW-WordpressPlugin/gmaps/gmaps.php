<?php
    /**
    * Plugin Name: GMaps
    * Description: Replaces [GMaps-map] with an actual google map
    * Version: 1.3
    * Author: Rosen
    */

    /*
    * Use example:
    *
    * [GMaps-map id="third" markers="(15, 50);(17.44, 9.5)" center="(15, 50)" zoom="5" width="600" height="600" units="px" key="AIzaSyDrLczSe8MEo3k5FAwo1Kc3fkn26NB-VUQ"]
    */

    defined('ABSPATH') or die('ABSPATH not defined');

    class GoogleMapsShortCode {
        function __construct () {
            add_shortcode('GMaps-map', array($this, 'add_map'));
            add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        }

        function enqueue_scripts () {
            wp_enqueue_script( 'init_maps', plugin_dir_url( __FILE__ ) . '/js/init-maps.js', array(), null, true);
        }

        function add_map ($atts) {
            try {
                $this->assert_user(is_array($atts), "Shortcode doesn't contain any arguments");
                $this->assert_user(array_key_exists('key', $atts), "API key must be specified");
                $this->assert_user(array_key_exists('width', $atts), "Map width must be specified");
                $this->assert_user(array_key_exists('height', $atts), "Map height must be specified");
                $this->assert_user(array_key_exists('id', $atts), "DOM id must be specified");

                if (!array_key_exists('units', $atts)) {
                    $atts['units'] = 'px';
                }

                $this->assert_user(is_numeric($atts['width']), "Width must be a number");
                $this->assert_user(is_numeric($atts['height']), "Height must be a number");

                $this->assert_user(!isset($GLOBALS['gmaps-api-key']) || $GLOBALS['gmaps-api-key'] === $atts['key'], "Cannot use multiple API keys");

                $GLOBALS['gmaps-api-key'] = $atts['key'];

                // unique name 'google_api_script' prevents wp_enqueue_script() from enqueuing script multiple times
                wp_enqueue_script( 'google_api_script', sprintf('https://maps.googleapis.com/maps/api/js?key=%s&callback=initMaps', $GLOBALS['gmaps-api-key']), array(), null, true);

                return $this->build_div($atts);

            } catch (Exception $e) {
                if (WP_DEBUG === true) {
                    error_log(print_r($e->getMessage(), true));
                }

                return '<div>There was an error in shortcode [GMaps-map]</div>';
            }
        }

        function build_div ($atts) {
            foreach ($atts as $key => $value) {
                $atts[$key] = htmlspecialchars($value);
            }

            $div = sprintf('<div id="%s" class="gmaps-map" style="width: %s%s; height: %s%s" ', $atts['id'], $atts['width'], $atts['units'], $atts['height'], $atts['units']);
            foreach ($atts as $key => $value) {
                if (in_array($key, ["center", "zoom", "markers"])) {
                    $div .= sprintf('data-%s="%s" ', $key, $value); 
                }
            }
            $div .= '></div>';
            return $div;
        }

        function assert_user ($condition, $msg) {
            if (!$condition) {
                throw new UserErrorGMaps($msg);
            }
        }
    }

    class UserErrorGMaps extends Exception {
        public function __construct($message, $code = 0, Exception $previous = null) {
            parent::__construct($message, $code, $previous);
        }
    }

    new GoogleMapsShortCode();
?>
