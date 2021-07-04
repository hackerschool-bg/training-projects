<?php
    /*
    * Plugin Name: Send Tests
    * Description: Plugin that enables a form for sending brainbench tests
    * Version: 1
    * Author: Rosen
    */

    defined('ABSPATH') or die('ABSPATH not defined');

    class BrainBenchTestsPlugin {
        const CODE_LENGTH = 30;
        const TESTS_PER_PAGE = 50;
        const TITLE = 'Test';
        const FORM_CSS_PATH = 'css/bb_tests_v1_admin_panel.css';
        const TEST_PAGE_CSS = 'css/bb_tests_v1_test_page.css';
        const ADMIN_PANEL_JS_PATH = 'js/bb_tests_v1_admin_panel.js';
        const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

        // Admin error messages
            // send test form
        const INVALID_EMAIL_ERR_MSG = "Въведеният имейл е невалиден.";
        const FILL_ALL_FIELDS_ERR_MSG = "Моля попълнете всички полета.";
        const INVALID_DUE_DATE_ERR_MSG = "Невалидна дата на срок.";
        const INVALID_START_DATE_ERR_MSG = "Невалидна дата на задаване.";
        const START_DATE_IN_THE_PAST_ERR_MSG = "Датата на задаване не може да бъде в миналото.";
        const DUE_DATE_BEFORE_START_DATE_ERR_MSG = "Датата на срока трябва да бъде след датата на започване.";

            // settings form
        const INVALID_CC_ERR_MSG = "Невалиден брой слотове.";

        // Test page errors
        const DUE_DATE_MET_ERR_MSG = "Срокът е изтекъл.";
        const LINK_NOT_VALID_ERR_MSG = "Линкът не е валиден.";
        const SERVICE_BLOCKED_ERR_MSG = "Услугата е заета, опитайте по-късно.";
        const TEST_ALREADY_COMPLETED_ERR_MSG = "Тестът вече е направен.";
        const START_DATE_IN_THE_FUTURE_ERR_MSG = "Тестът ще бъде активен от %s до %s вкл.";
        const INVALID_POST_PARAMETERS_ERR_MSG = "Невалидна заявка.";
        const RECAPTCHA_FAILED_ERR_MSG = "Моля потвърдете, че не сте робот.";

        // Opt name/def values
        const MAX_CONCURRENT_TESTS_OPT_NAME = "maximum_concurrent_tests";
        const MAX_CONCURRENT_TESTS_DEF_VALUE = "2";
        const EMAIL_MSG_OPT_NAME = "email_msg";
        const EMAIL_MSG_DEF_VALUE = "";
        const EMAIL_SENDER_OPT_NAME = "email_sender";
        const EMAIL_SENDER_DEF_VALUE = "wordpress@example.com";
        const EMAIL_SENDER_NAME_OPT_NAME = "email_sender_name";
        const EMAIL_SENDER_NAME_DEF_VALUE = "Wordpress";
        const EMAIL_SUBJECT_OPT_NAME = "email_subject";
        const EMAIL_SUBJECT_DEF_VALUE = "Test";
        const RECAPTCHA_SITE_KEY_OPT_NAME = "recaptcha_site_key";
        const RECAPTCHA_SITE_KEY_DEF_VALUE = "";
        const RECAPTCHA_SECRET_KEY_OPT_NAME = "recaptcha_secret_key";
        const RECAPTCHA_SECRET_KEY_DEF_VALUE = "";

        function __construct () {
            if (array_key_exists('page_id', $_GET) && get_page_by_title(BrainBenchTestsPlugin::TITLE )->ID === (int)$_GET['page_id']) {
                add_filter('the_content', array($this, 'load_test_page'));
            }
          
            // add the action 
            add_action('wp_mail_failed', 'on_mail_error', 10, 1);
            add_action('phpmailer_init', array($this, 'init_smtp'));
            add_action('admin_menu', array($this, 'brainbench_tests_setup_menu'));
        }

        function init_smtp ($phpmailer) {
            if (!is_object($phpmailer)) {
                $phpmailer = (object) $phpmailer;
            }

            global $wpdb;

            $phpmailer->isSMTP();
            $phpmailer->Host       = SMTP_HOST;
            $phpmailer->SMTPAuth   = SMTP_AUTH;
            $phpmailer->Port       = SMTP_PORT;

            $phpmailer->From = $wpdb->get_results(sprintf("
                SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", 
                $wpdb->prefix, BrainBenchTestsPlugin::EMAIL_SENDER_OPT_NAME
            ))[0]->opt_value;

            $phpmailer->FromName = $wpdb->get_results(sprintf("
                SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", 
                $wpdb->prefix, BrainBenchTestsPlugin::EMAIL_SENDER_NAME_OPT_NAME
            ))[0]->opt_value;
        }

        function brainbench_tests_setup_menu () {
            if (current_user_can('administrator')) {
                $test_menu = add_menu_page('Send Test', 'Send Test', 'manage_options', 'bb_tests_v1', array($this, 'init_page'));
            }
        }

        function init_page () {
            wp_enqueue_style( 'form-css', plugin_dir_url( __FILE__ ) . BrainBenchTestsPlugin::FORM_CSS_PATH );

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $this->get_admin_page();
            }

            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $this->post_admin_page();
            }

            wp_enqueue_script( 'admin-panel-js', plugin_dir_url( __FILE__ ) . BrainBenchTestsPlugin::ADMIN_PANEL_JS_PATH );
        }

        function display_settings_form () {
            global $wpdb;

            $settings = [];

            foreach ([
                BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_OPT_NAME,
                BrainBenchTestsPlugin::EMAIL_SENDER_OPT_NAME,
                BrainBenchTestsPlugin::EMAIL_SENDER_NAME_OPT_NAME,
                BrainBenchTestsPlugin::EMAIL_SUBJECT_OPT_NAME ] as $value) {
                    array_push($settings, $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, $value))[0]->opt_value);
            }

            foreach ([
                BrainBenchTestsPlugin::EMAIL_MSG_OPT_NAME,
                BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_OPT_NAME,
                BrainBenchTestsPlugin::RECAPTCHA_SECRET_KEY_OPT_NAME ] as $value) {
                    array_push($settings, $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, $value))[0]->opt_value);
            }

            echo vsprintf("
                    <label id=\"settings-form\"></label>
                    <form onsubmit=\"return checkBeforeSubmit()\" id=\"settings-form\" class=\"admin-form\" method=\"post\" action=\"#settings-form\">
                        <p>Settings</p>
                        <input id=\"link-dup\" name=\"link\" style=\"display: none\">
                        <input id=\"real-name-dup\" name=\"real-name\" style=\"display: none\">
                        <input id=\"email-dup\" type=\"email\" name=\"email\" style=\"display: none\">
                        <input id=\"date-from-dup\" type=\"date\" name=\"date-from\" style=\"display: none\">
                        <input id=\"date-to-dup\" type=\"date\" name=\"date-to\" style=\"display: none\">
                        <label for=\"max_parallel\">Test Slots:</label>
                        <input name=\"max_parallel\" value=\"%s\">
                        <label for=\"email_sender\">Email Sender:</label>
                        <input name=\"email_sender\" type=\"email\" value=\"%s\">
                        <label for=\"email_sender\">Email Sender Name:</label>
                        <input name=\"email_sender_name\" value=\"%s\">
                        <label for=\"email_subject\">Email Subject:</label>
                        <input name=\"email_subject\" value=\"%s\">
                        <label for=\"email_msg\">Email Text:</label>
                        <textarea class=\"email_msg\" name=\"email_msg\" rows=\"6\" style=\"margin-top: 10px;\">%s</textarea>
                        <label id=\"hints-label\"></label>
                        <textarea id=\"hints-textarea\" rows=\"6\" style=\"color: #333333; background-color: #EEEEEE; margin-top: 10px; resize: none;\" disabled=\"disabled\">Placeholders: \n\nRecipient Name: &lt;name&gt; \nTest Link: &lt;link&gt; \nFrom Date: &lt;from&gt; \nDue Date: &lt;to&gt;</textarea>
                        <label for=\"site_key\">Recaptcha site key:</label>
                        <input name=\"site_key\" value=\"%s\">
                        <label for=\"secret_key\">Recaptcha secret key:</label>
                        <input name=\"secret_key\" value=\"%s\">
                        <label></label>
                        <input type=\"submit\" value=\"Save\">
                    </form>
                ", $settings
            );
        }

        function get_admin_page () {
            global $wpdb;
            $wpdb->query(sprintf("UPDATE %sbrainbench_tests SET status = '%s' WHERE unlock_time <= '%s' AND status = '%s'", $wpdb->prefix, BrainBenchTestStatus::COMPLETED, strtotime('now'), BrainBenchTestStatus::STARTED));

            $this->display_send_test_form();
            $this->display_settings_form();
            $this->display_tests();
        }

        function post_admin_page () {
            global $wpdb;
            
            if (array_key_exists('max_parallel', $_POST)) { // settings form
                $this->display_send_test_form();

                $rows = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_OPT_NAME));

                echo "<label id=\"settings-form\"></label>";
                echo "<form onsubmit=\"return checkBeforeSubmit()\" class=\"admin-form\" method=\"post\" action=\"#settings-form\">";
                echo "<p>Settings</p>";
                echo sprintf("
                    <input id=\"link-dup\" name=\"link\" style=\"display: none\" value=\"%s\">
                    <input id=\"real-name-dup\" name=\"real-name\" style=\"display: none\" value=\"%s\">
                    <input id=\"email-dup\" type=\"email\" name=\"email\" style=\"display: none\" value=\"%s\">
                    <input id=\"date-from-dup\" type=\"date\" name=\"date-from\" style=\"display: none\" value=\"%s\">
                    <input id=\"date-to-dup\" type=\"date\" name=\"date-to\" style=\"display: none\" value=\"%s\">
                ", $_POST['link'], $_POST['real-name'], $_POST['email'], $_POST['date-from'], $_POST['date-to']);
                echo "  <label for=\"max_parallel\">Test Slots: </label>\n";
                echo (is_numeric($_POST['max_parallel']) && (int) $_POST['max_parallel'] > 0 ? sprintf("<input name=\"max_parallel\" value=\"%s\">", htmlspecialchars($_POST['max_parallel'])) : sprintf("<input name=\"max_parallel\" class=\"invalid-input\" value=\"%s\">", $rows[0]->opt_value));

                echo sprintf("
                    <label for=\"email_sender\">Email Sender:</label>
                    <input name=\"email_sender\" type=\"email\" value=\"%s\">", $_POST['email_sender']
                );
                echo sprintf("
                    <label for=\"email_sender_name\">Email Sender Name:</label>
                    <input name=\"email_sender_name\" value=\"%s\">", $_POST['email_sender_name']
                );

                echo sprintf("
                    <label for=\"email_subject\">Email Subject:</label>
                    <input name=\"email_subject\" value=\"%s\">", $_POST['email_subject']
                );
                echo sprintf("
                    <label for=\"email_msg\">Email Text:</label>
                    <textarea class=\"email_msg\" name=\"email_msg\" rows=\"6\" style=\"width: 400px; margin-top: 20px;\">%s</textarea>", htmlspecialchars($_POST['email_msg'])
                );
                echo "
                    <label id=\"hints-label\"></label>
                    <textarea id=\"hints-textarea\" name=\"placeholders\" rows=\"6\" style=\"color: #333333; background-color: #EEEEEE; margin-top: 10px; resize: none;\" disabled=\"disabled\">Placeholders: \n\nRecipient Name: &lt;name&gt; \nTest Link: &lt;link&gt; \nFrom Date: &lt;from&gt; \nDue Date: &lt;to&gt;</textarea>
                ";
                echo sprintf("
                    <label for=\"site_key\">Recaptcha site key:</label>
                    <input name=\"site_key\" value=\"%s\">", $_POST['site_key']
                );
                echo sprintf("
                    <label for=\"secret_key\">Recaptcha secret key:</label>
                    <input name=\"secret_key\" value=\"%s\">", $_POST['secret_key']
                );
                echo "<label></label>\n";
                echo "<input type=\"submit\" value=\"Save\">";

                $has_errors = false;

                try {
                    $this->assert_user(is_numeric($_POST['max_parallel']) && (int) $_POST['max_parallel'] > 0, BrainBenchTestsPlugin::INVALID_CC_ERR_MSG);
                } catch (UserErrorWPTests $err) {
                    $has_errors = true;
                    echo sprintf("<p id=\"err-msg\">%s</p>", htmlspecialchars($err->getMessage()));
                }

                if (!$has_errors) {
                    foreach ([
                        BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_OPT_NAME => $_POST['max_parallel'],
                        BrainBenchTestsPlugin::EMAIL_MSG_OPT_NAME => $_POST['email_msg'],
                        BrainBenchTestsPlugin::EMAIL_SENDER_OPT_NAME => $_POST['email_sender'],
                        BrainBenchTestsPlugin::EMAIL_SENDER_NAME_OPT_NAME => $_POST['email_sender_name'],
                        BrainBenchTestsPlugin::EMAIL_SUBJECT_OPT_NAME => $_POST['email_subject'],
                        BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_OPT_NAME => $_POST['site_key'],
                        BrainBenchTestsPlugin::RECAPTCHA_SECRET_KEY_OPT_NAME => $_POST['secret_key']] as $key => $value) {
                        $wpdb->query($wpdb->prepare(sprintf("UPDATE %sbrainbench_settings SET opt_value = '%s' WHERE opt_name = '%s'", $wpdb->prefix, '%s', $key), $value));
                    }

                    echo "<p>Настройките бяха запазени.</p>";
                }

                echo "</form>";
                $this->display_tests();
                return;
            }

            // adding invalid-input class on invalid data
            echo "<label id=\"test-form\"></label>";
            echo "<form onsubmit=\"return checkBeforeSubmit()\" class=\"admin-form\" method=\"post\" action=\"#test-from\">"; // send tests form
            echo "<p>Send Test</p>";
            echo "<label for=\"link\">Link URL:</label>\n";
            echo ($_POST['link'] ? sprintf("<input id=\"link\" type=\"text\" name=\"link\" value=\"%s\">", htmlspecialchars($_POST['link'])) : "<input id=\"link\" type=\"text\" name=\"link\" class=\"invalid-input\">");
            echo "<label for=\"real-name\">Name:</label>\n";
            echo ($_POST['real-name'] ? sprintf("<input id=\"real-name\" type=\"text\" name=\"real-name\" value=\"%s\">", htmlspecialchars($_POST['real-name'])) : "<input id=\"real-name\" type=\"text\" name=\"real-name\" class=\"invalid-input\">");
            echo "<label for=\"email\">E-mail:</label>\n";
            echo ($_POST['email'] && filter_var($_POST['email'], FILTER_VALIDATE_EMAIL) ? sprintf("<input id=\"email\" type=\"email\" name=\"email\" value=\"%s\">", htmlspecialchars($_POST['email'])) : sprintf("<input id=\"email\" type=\"email\" name=\"email\" value=\"%s\" class=\"invalid-input\">", htmlspecialchars($_POST['email'])));
            echo "<label for=\"date-from\">Start Date:</label>\n";
            echo ($_POST['date-from'] && $this->isRealDate($_POST['date-from']) && strtotime($_POST['date-from']) >= strtotime('today') ? sprintf("<input id=\"date-from\" type=\"date\" name=\"date-from\" value=\"%s\">", htmlspecialchars($_POST['date-from'])) : sprintf("<input id=\"date-from\" type=\"date\" name=\"date-from\" value=\"%s\" class=\"invalid-input\">", htmlspecialchars($_POST['date-from'])));
            echo "<label for=\"date-to\">Due Date:</label>\n";
            echo ($_POST['date-to'] && $this->isRealDate($_POST['date-to']) && strtotime($_POST['date-to']) >= strtotime($_POST['date-from']) ? sprintf("<input id=\"date-to\" type=\"date\" name=\"date-to\" value=\"%s\">", htmlspecialchars($_POST['date-to'])) : sprintf("<input id=\"date-to\" type=\"date\" name=\"date-to\" value=\"%s\" class=\"invalid-input\">", htmlspecialchars($_POST['date-to'])));
            echo "<label for=\"submit\"></label>\n";
            echo "<input type=\"submit\" value=\"Send Email\">";

            $has_errors = false;

            try {
                $this->assert_user($_POST['link'] && $_POST['email'] && $_POST['date-from'] && $_POST['date-to'] && $_POST['real-name'], BrainBenchTestsPlugin::FILL_ALL_FIELDS_ERR_MSG);
                
                $this->assert_user(filter_var($_POST['email'], FILTER_VALIDATE_EMAIL), BrainBenchTestsPlugin::INVALID_EMAIL_ERR_MSG);

                $this->assert_user($this->isRealDate($_POST['date-from']), BrainBenchTestsPlugin::INVALID_START_DATE_ERR_MSG);
                $this->assert_user($this->isRealDate($_POST['date-to']), BrainBenchTestsPlugin::INVALID_DUE_DATE_ERR_MSG);

                $this->assert_user(strtotime($_POST['date-from']) >= strtotime('today'), BrainBenchTestsPlugin::START_DATE_IN_THE_PAST_ERR_MSG);
                $this->assert_user(strtotime($_POST['date-to']) >= strtotime($_POST['date-from']), BrainBenchTestsPlugin::DUE_DATE_BEFORE_START_DATE_ERR_MSG);
            } catch (UserErrorWPTests $err) {
                echo sprintf("<p id=\"err-msg\">%s</p>", htmlspecialchars($err->getMessage()));
                $has_errors = true;
            }

            if (!$has_errors) { 
                // resetting form on successful submition
                echo "
                    <script>
                        document.getElementById('link').value = \"\";
                        document.getElementById('real-name').value = \"\";
                        document.getElementById('email').value = \"\";
                    </script>
                ";

                $code = $this->generate_random_string(BrainBenchTestsPlugin::CODE_LENGTH);
                $link = sprintf("%s&test=%s", get_permalink(get_page_by_title( BrainBenchTestsPlugin::TITLE )->ID), $code);

                if (strpos($_POST['link'], 'http://') !== 0 && strpos($_POST['link'], 'https://') !== 0) {
                    $_POST['link'] = 'http://' . $_POST['link'];
                }

                $wpdb->insert(
                    $wpdb->prefix . "brainbench_tests",
                    array(
                        'link' => $_POST['link'],
                        'email' => $_POST['email'],
                        'start_date' => $_POST['date-from'],
                        'due_date' => $_POST['date-to'],
                        'status' => BrainBenchTestStatus::NOT_SENT,
                        'code' => $code
                    )
                );

                $subject = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::EMAIL_SUBJECT_OPT_NAME))[0]->opt_value;
                $msg = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::EMAIL_MSG_OPT_NAME))[0]->opt_value;

                $msg = str_replace("<link>", $link, $msg);
                $msg = str_replace("<name>", htmlspecialchars($_POST['real-name']), $msg);
                $msg = str_replace("<from>", htmlspecialchars($_POST['date-from']), $msg);
                $msg = str_replace("<to>", htmlspecialchars($_POST['date-to']), $msg);

                if ($this->send_email($_POST['email'], $subject, $msg)) {
                    $wpdb->query($wpdb->prepare(sprintf("UPDATE %sbrainbench_tests SET status = '%s' WHERE code = '%s'", $wpdb->prefix, BrainBenchTestStatus::SENT, '%s'), $code));
                    echo sprintf("<p>Теста беше успешно изпратен на %s</p>", htmlspecialchars($_POST['email']));
                } else {
                    echo sprintf("<p id=\"err-msg\">Теста не беше изпратен успешно</p>");
                }
            }

            echo "</form>";

            $this->display_settings_form();
            $this->display_tests();
        }

        function send_email ($to, $subject, $msg) {
            return wp_mail($to, $subject, $msg);
        }

        function display_send_test_form () {
            echo "
                <label id=\"test-from\"></label>
                <form onsubmit=\"return checkBeforeSubmit()\" class=\"admin-form\" id=\"test-form\" method=\"post\" action=\"#test-from\">
                    <p>Send Test</p>
                    <label for=\"link\">Link URL:</label>
                    <input id=\"link\" name=\"link\">
                    <label for=\"real-name\">Name:</label>
                    <input id=\"real-name\" name=\"real-name\">
                    <label for=\"email\">E-mail:</label>
                    <input id=\"email\" type=\"email\" name=\"email\">
                    <label for=\"date-from\">Start Date:</label>
                    <input id=\"date-from\" type=\"date\" name=\"date-from\">
                    <label for=\"date-to\">Due Date:</label>
                    <input id=\"date-to\" type=\"date\" name=\"date-to\">
                    <label for=\"submit\"></label>
                    <input type=\"submit\" value=\"Send Email\">
                </form>
            ";
        }

        function display_tests () {
            global $wpdb;

            $search = '';
            $offset = 0;
            $real_offset = 0;

            if (array_key_exists('search', $_GET)) {
                $search = $_GET['search'];
            }

            if (array_key_exists('offset', $_GET) && is_numeric($_GET['offset']) && (int) $_GET['offset'] > 0) {
                $offset = (int) $_GET['offset'];
                $real_offset = (int) $_GET['offset'] * BrainBenchTestsPlugin::TESTS_PER_PAGE;
            }

            $test_count = $wpdb->get_results(sprintf("SELECT COUNT(*) as count FROM %sbrainbench_tests WHERE email LIKE '%s'", $wpdb->prefix, '%' . $search . '%'));

            $test_rows = $wpdb->get_results(sprintf("SELECT * FROM %sbrainbench_tests WHERE email LIKE '%s' ORDER BY id DESC LIMIT %s OFFSET %s", $wpdb->prefix, '%' . $search . '%', BrainBenchTestsPlugin::TESTS_PER_PAGE, $real_offset));

            echo "
                <label id=\"search-form\"></label>
                <form onsubmit=\"return checkBeforeSubmit()\" class=\"admin-form\" action=\"#search-form\">
                    <p>Search Test</p>
                    <input name=\"page\" value=\"bb_tests_v1\" style=\"display: none\">
                    <label for=\"search\">Email:</label>
                    <input name=\"search\">
                    <label></label>
                    <input type=\"submit\" value=\"Search\">
                </form>
            ";

            echo "<label id=\"test-report\"></label>";
            echo "<div class=\"tests\">";
            echo sprintf("<p>Showing %s-%s out of %s results</p>", $real_offset, $real_offset + count($test_rows), $test_count[0]->count);

            echo "<div class=\"controls\">";

            echo sprintf(
                "<form onsubmit=\"return checkBeforeSubmit()\" class=\"ctrl-form\" action=\"#test-report\">
                    <input name=\"page\" value=\"bb_tests_v1\" style=\"display: none\">
                    <input name=\"search\" value=\"%s\" style=\"display: none\">
                    <input name=\"offset\" value=\"%s\" style=\"display: none\">
                    <button>Previous Page</button>
                </form>", $search, $offset - 1
            );


            if ($real_offset + count($test_rows) === (int) $test_count[0]->count) {
                $offset -= 1;
            }

            echo sprintf(
                "<form onsubmit=\"return checkBeforeSubmit()\" class=\"ctrl-form\" action=\"#test-report\">
                    <input name=\"page\" value=\"bb_tests_v1\" style=\"display: none\">
                    <input name=\"search\" value=\"%s\" style=\"display: none\">
                    <input name=\"offset\" value=\"%s\" style=\"display: none\">
                    <button>Next Page</button>
                </form>", $search, $offset + 1
            );

            echo "</div>";

            echo "<table class=\"test-table\" style=\"margin-top: 3em; width: 100%;\">";
            echo "  <tr>
                        <th>ID</th>
                        <th>Test</th>
                        <th>Email</th>
                        <th>Start Date</th>
                        <th>Due Date</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Audit</th>
                    </tr>";

            foreach ($test_rows as $row) {
                $test_audits = $wpdb->get_results(sprintf("SELECT * FROM %sbrainbench_odit WHERE test_id = '%s'", $wpdb->prefix, $row->id));

                $audit = '';

                if (count($test_audits) > 0) {
                    foreach ($test_audits as $test_audit) {
                        $audit .= sprintf("%s%s%s\\n", $test_audit->time, str_repeat(" ", 20), $test_audit->event);
                    }
                } else {
                    $audit .= 'No actions have been performed for this test.';
                }

                echo sprintf("  
                    <tr>
                        <th>%s</th>
                        <th><a href=\"%s\">link</a></th>
                        <th>%s</th>
                        <th>%s</th>
                        <th>%s</th>
                        <th>%s</th>
                        <th>%s</th>
                        <th onclick=\"alert('%s'); return false;\"><a href=\"\">audit</a></th>
                    </tr>", $row->id, htmlspecialchars($row->link),  $row->email,  $row->start_date,  $row->due_date, $row->code, $row->status, $audit
                );
            }

            echo "</table>";
            echo "</div>";
        }

        function generate_random_string ($length = 20) {
            $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $charactersLength = strlen($characters);
            $randomString = '';
             for ($i = 0; $i < $length; $i++) {
                $randomString .= $characters[rand(0, $charactersLength - 1)];
            }
             return $randomString;
        }

        function can_start_new_test () {
            global $wpdb;

            $locks = $wpdb->get_results(sprintf("SELECT COUNT(*) AS count FROM %sbrainbench_tests WHERE unlock_time > '%s'", $wpdb->prefix, strtotime("now")));
            $max_parallel = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings where opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_OPT_NAME));

            return $locks[0]->count < (int)$max_parallel[0]->opt_value;
        }

        function load_test_page () {
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $this->get_test_page();
            }

            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $this->post_test_page();
            }
        }

        function get_test_page ($err = NULL) {
            global $wpdb;

            wp_enqueue_style( 'test-page-css', plugin_dir_url( __FILE__ ) . BrainBenchTestsPlugin::TEST_PAGE_CSS );

            try {
                $site_key = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_OPT_NAME))[0]->opt_value;

                wp_enqueue_script('recaptcha', sprintf("https://www.google.com/recaptcha/api.js", $site_key));

                $this->assert_user(array_key_exists('test', $_GET), BrainBenchTestsPlugin::LINK_NOT_VALID_ERR_MSG);

                $rows = $wpdb->get_results($wpdb->prepare(sprintf("SELECT * FROM %sbrainbench_tests WHERE code = %s", $wpdb->prefix, '%s'), $_GET['test']));

                $this->assert_user(count($rows) > 0, BrainBenchTestsPlugin::LINK_NOT_VALID_ERR_MSG);

                $wpdb->insert(
                    $wpdb->prefix . "brainbench_odit",
                    array(
                        'event' => sprintf("Test page visited"),
                        'test_id' => $rows[0]->id
                    )
                );

                $this->assert_user($rows[0]->status !== BrainBenchTestStatus::COMPLETED, BrainBenchTestsPlugin::TEST_ALREADY_COMPLETED_ERR_MSG);

                $this->assert_user(strtotime($rows[0]->start_date) <= strtotime('today'), sprintf(BrainBenchTestsPlugin::START_DATE_IN_THE_FUTURE_ERR_MSG, $rows[0]->start_date, $rows[0]->due_date));
                $this->assert_user(strtotime($rows[0]->due_date) >= strtotime('today'), BrainBenchTestsPlugin::DUE_DATE_MET_ERR_MSG);

                if ($rows[0]->status === BrainBenchTestStatus::STARTED) {
                    echo sprintf("<script>document.location.href='%s'</script>", htmlspecialchars($rows[0]->link));
                    return;
                }

                $wpdb->query($wpdb->prepare(sprintf("UPDATE %sbrainbench_tests SET status = '%s' WHERE code = '%s'", $wpdb->prefix, BrainBenchTestStatus::ACTIVATED, '%s'), $_GET['test']));

                $this->assert_user($this->can_start_new_test(), BrainBenchTestsPlugin::SERVICE_BLOCKED_ERR_MSG);

                echo "<form onsubmit=\"return checkBeforeSubmit()\" class=\"admin-form\" method=\"post\" style=\"width: 300px; margin-left: 38%\">";
                echo "<p>Complete the following captcha to continue with the test.</p>";
                echo sprintf("<div class=\"g-recaptcha\" data-sitekey=\"%s\"></div>", $site_key);
                echo "<input type=\"submit\" value=\"Start Test\" style=\"width: 100%\">";
                if ($err) {
                    echo sprintf("<p id=\"err-msg\" style=\"color: #FF0000;\">%s</p>", htmlspecialchars($err->getMessage()));
                }
                echo "</form>";
            } catch (UserErrorWPTests $err) {
                echo sprintf("<p id=\"err-msg\" style=\"color: #FF0000;text-align: center;font-weight: bold;\">%s</p>", htmlspecialchars($err->getMessage()));
            }
        }

        function post_test_page () {
            global $wpdb;

            try {
                $site_key = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_OPT_NAME))[0]->opt_value;
                $secret_key = $wpdb->get_results(sprintf("SELECT opt_value FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, BrainBenchTestsPlugin::RECAPTCHA_SECRET_KEY_OPT_NAME))[0]->opt_value;

                wp_enqueue_script( 'recaptcha', sprintf("https://www.google.com/recaptcha/api.js", $site_key) );

                $test_rows = $wpdb->get_results($wpdb->prepare(sprintf("SELECT * FROM %sbrainbench_tests where code = '%s'", $wpdb->prefix, '%s'), $_GET['test']));

                $this->assert_user(count($test_rows) === 1, BrainBenchTestsPlugin::LINK_NOT_VALID_ERR_MSG);

                $response = wp_remote_post(BrainBenchTestsPlugin::RECAPTCHA_VERIFY_URL, 
                    ['body' => [
                        'secret' => $secret_key, 
                        'response' => $_POST['g-recaptcha-response']
                    ]]
                );

                $this->assert_user(json_decode($response["body"])->success === true, BrainBenchTestsPlugin::RECAPTCHA_FAILED_ERR_MSG);

                $wpdb->insert(
                    $wpdb->prefix . "brainbench_odit",
                    array(
                        'event' => sprintf("Start button clicked"),
                        'test_id' => $test_rows[0]->id
                    )
                );

                $this->assert_user($this->can_start_new_test(), BrainBenchTestsPlugin::SERVICE_BLOCKED_ERR_MSG);

                $wpdb->query($wpdb->prepare(sprintf("UPDATE %sbrainbench_tests SET status = '%s', unlock_time = '%s' WHERE code = '%s'", $wpdb->prefix, BrainBenchTestStatus::STARTED, strtotime('now +2 hour'), '%s'), $test_rows[0]->code));
                echo sprintf("<script>document.location.href='%s'</script>", htmlspecialchars($test_rows[0]->link));
            } catch (UserErrorWPTests $err) {
                $this->get_test_page($err);
            }
        }

        function isRealDate ($date) {
            if (false === strtotime($date)) {
                return false;
            }

            list($year, $month, $day) = explode('-', $date);
            return checkdate($month, $day, $year);
        }

        function assert_user ($condition, $msg) {
            if (!$condition) {
                throw new UserErrorWPTests($msg);
            }
        }
    }

    class UserErrorWPTests extends Exception {
        public function __construct($message, $code = 0, Exception $previous = null) {
            parent::__construct($message, $code, $previous);
        }
    }

    abstract class BrainBenchTestStatus {
        const NOT_SENT = 'not sent';
        const SENT = 'sent';
        const ACTIVATED = 'activated';
        const STARTED = 'started';
        const COMPLETED = 'completed';
    }

    function on_bbt_activate () {
        global $wpdb;

        if (get_page_by_title( BrainBenchTestsPlugin::TITLE ) == null || get_page_by_title( BrainBenchTestsPlugin::TITLE )->post_status !== 'publish') {
            // Create the page if no such
            wp_insert_post(array(
              'post_title'    => BrainBenchTestsPlugin::TITLE,
              'post_content'  => '',
              'post_status'   => 'publish',
              'post_author'   => 1,
              'post_type'     => 'page',
            ));
        }

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta(sprintf("
                CREATE TABLE IF NOT EXISTS %sbrainbench_tests (
                    id INT AUTO_INCREMENT,
                    link TEXT NOT NULL,
                    email TEXT NOT NULL,
                    start_date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    code TEXT NOT NULL,
                    status TEXT NOT NULL,
                    unlock_time BIGINT,
                    PRIMARY KEY (id)
                );
            ", $wpdb->prefix
        ));

        dbDelta(sprintf("
                CREATE TABLE IF NOT EXISTS %sbrainbench_settings (
                    id INT AUTO_INCREMENT,
                    opt_name TEXT NOT NULL,
                    opt_value TEXT NOT NULL,
                    PRIMARY KEY (id)
                );
            ", $wpdb->prefix
        ));

        dbDelta(sprintf("
                CREATE TABLE IF NOT EXISTS %sbrainbench_odit (
                    id INT AUTO_INCREMENT,
                    event TEXT NOT NULL,
                    time TIMESTAMP NOT NULL,
                    test_id INT,
                    PRIMARY KEY (id),
                    FOREIGN KEY (test_id) REFERENCES %sbrainbench_tests(id)
                );
            ", $wpdb->prefix, $wpdb->prefix
        ));

        $opts_default_values = [ 
            BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_OPT_NAME => BrainBenchTestsPlugin::MAX_CONCURRENT_TESTS_DEF_VALUE, 
            BrainBenchTestsPlugin::EMAIL_MSG_OPT_NAME => BrainBenchTestsPlugin::EMAIL_MSG_DEF_VALUE, 
            BrainBenchTestsPlugin::EMAIL_SENDER_OPT_NAME => BrainBenchTestsPlugin::EMAIL_SENDER_DEF_VALUE, 
            BrainBenchTestsPlugin::EMAIL_SENDER_NAME_OPT_NAME => BrainBenchTestsPlugin::EMAIL_SENDER_NAME_DEF_VALUE, 
            BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_OPT_NAME => BrainBenchTestsPlugin::RECAPTCHA_SITE_KEY_DEF_VALUE, 
            BrainBenchTestsPlugin::RECAPTCHA_SECRET_KEY_OPT_NAME => BrainBenchTestsPlugin::RECAPTCHA_SECRET_KEY_DEF_VALUE, 
            BrainBenchTestsPlugin::EMAIL_SUBJECT_OPT_NAME => BrainBenchTestsPlugin::EMAIL_SUBJECT_DEF_VALUE 
        ];

        foreach ($opts_default_values as $option => $default) {
            $rows = $wpdb->get_results(sprintf("SELECT * FROM %sbrainbench_settings WHERE opt_name = '%s'", $wpdb->prefix, $option));

            if (count($rows) === 0) {
                $wpdb->insert(
                    $wpdb->prefix . "brainbench_settings",
                    array(
                        'opt_name' => $option,
                        'opt_value' => $default
                    )
                );
            }
        }
    }

    function on_bbt_deactivate () {
        if (get_page_by_title( BrainBenchTestsPlugin::TITLE ) != null) {
            wp_delete_post(get_page_by_title( BrainBenchTestsPlugin::TITLE )->ID);
        }
    }

    function on_mail_error ($err) {
        foreach ($err->errors['wp_mail_failed'] as $error) {
            echo sprintf("<p style=\"color: red\">%s</p>", $error);
        }
    }    

    register_activation_hook ( __FILE__, 'on_bbt_activate');
    register_deactivation_hook ( __FILE__, 'on_bbt_deactivate');

    add_action('wp_loaded', function () {
        new BrainBenchTestsPlugin();
    });
?>