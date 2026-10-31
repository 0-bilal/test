"""Browser regressions. Run: python3 -m unittest discover -s tests -v
Requires Python Playwright and Chromium; starts its own local static server.
"""
import functools
import http.server
import os
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright


class MenuTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                    directory=str(Path(__file__).resolve().parents[1]))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def page(self, width=390, height=844, reduced_motion='no-preference'):
        page = self.browser.new_page(viewport={'width': width, 'height': height},
                                     has_touch=True, reduced_motion=reduced_motion)
        self.addCleanup(page.close)
        # The external styles are optional; verify controls work even without them.
        page.route('https://**/*', lambda route: route.abort())
        page.goto(self.url)
        return page

    def closed(self, page):
        page.wait_for_function("document.querySelector('#m-modal-overlay').inert")
        self.assertFalse(page.locator('#m-modal-overlay').is_visible())
        self.assertFalse(page.locator('#m-main').evaluate('e=>e.inert'))

    def touch(self, page, selector, kind, y):
        page.locator(selector).evaluate('''(el, args) => {
          const [kind,y] = args;
          const touch = new Touch({identifier:1,target:el,clientX:100,clientY:y});
          el.dispatchEvent(new TouchEvent(kind, {bubbles:true,cancelable:true,
            touches:kind==='touchend'||kind==='touchcancel'?[]:[touch],changedTouches:[touch]}));
        }''', [kind, y])

    def test_images_and_close_at_mobile_desktop_and_landscape(self):
        for width, height in [(320,568),(390,844),(844,390),(1280,900)]:
            with self.subTest(size=(width,height)):
                page = self.page(width,height)
                errors=[]
                page.on('pageerror', lambda error: errors.append(str(error)))
                self.assertEqual(page.locator('.m-card').count(),15)
                page.locator('.m-card').first.click()
                page.wait_for_timeout(400)
                image=page.locator('.m-modal-img')
                self.assertEqual(image.evaluate('e=>getComputedStyle(e).objectFit'),'contain')
                self.assertTrue(image.evaluate('e=>e.complete && e.naturalWidth>0'))
                self.assertGreater(page.locator('.m-modal-body').evaluate('e=>e.clientHeight'),60)
                self.assertTrue(page.locator('#m-modal-close svg').is_visible())
                self.assertEqual(page.locator('.m-modal-meal-price .m-modal-price-num').inner_text(),'33')
                page.locator('#m-modal-close').click()
                self.closed(page)
                self.assertTrue(page.locator('.m-card').first.evaluate('e=>e===document.activeElement'))
                self.assertEqual(errors,[])

    def test_swipe_close_reopen_and_cancel(self):
        page=self.page()
        for _ in range(3):
            page.locator('.m-card').first.click()
            page.wait_for_timeout(400)
            self.touch(page,'.m-modal-body','touchstart',200)
            self.touch(page,'.m-modal-body','touchmove',340)
            self.touch(page,'.m-modal-body','touchend',340)
            self.assertEqual(page.locator('#m-modal').evaluate('e=>e.style.transform'),'')
            self.touch(page,'.m-modal-handle','touchstart',200)
            self.touch(page,'.m-modal-handle','touchmove',240)
            self.touch(page,'.m-modal-handle','touchcancel',240)
            self.assertEqual(page.locator('#m-modal').evaluate('e=>e.style.transform'),'')
            self.touch(page,'.m-modal-handle','touchstart',200)
            self.touch(page,'.m-modal-handle','touchmove',350)
            self.touch(page,'.m-modal-handle','touchend',350)
            self.closed(page)
        page.locator('.m-card').nth(1).click()
        page.wait_for_timeout(400)
        self.assertEqual(page.locator('#m-modal').evaluate('e=>getComputedStyle(e).transform'),'matrix(1, 0, 0, 1, 0, 0)')

    def test_scroll_focus_keyboard_back_and_overlay(self):
        page=self.page()
        card=page.locator('.m-card').nth(6)
        card.scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        y=page.evaluate('scrollY')
        card.focus()
        page.keyboard.press('Space')
        self.assertTrue(page.locator('#m-main').evaluate('e=>e.inert'))
        page.wait_for_timeout(400)
        page.keyboard.press('Shift+Tab')
        self.assertTrue(page.locator('.m-sauce-btn').last.evaluate('e=>e===document.activeElement'))
        page.keyboard.press('Tab')
        self.assertTrue(page.locator('#m-modal-close').evaluate('e=>e===document.activeElement'))
        page.keyboard.press('Escape')
        self.closed(page)
        self.assertAlmostEqual(page.evaluate('scrollY'),y,delta=1)
        card.click()
        page.go_back()
        self.closed(page)
        self.assertAlmostEqual(page.evaluate('scrollY'),y,delta=1)
        card.click()
        page.wait_for_timeout(400)
        page.locator('#m-modal-overlay').click(position={'x':5,'y':5})
        self.closed(page)
        self.assertAlmostEqual(page.evaluate('scrollY'),y,delta=1)

    def test_repeated_close_requests_do_not_leave_menu(self):
        page=self.page()
        page.locator('.m-card').first.click()
        page.evaluate("()=>{const b=document.querySelector('#m-modal-close');b.click();b.click();b.click();}")
        self.closed(page)
        self.assertEqual(page.url,self.url)

    def test_desktop_category_at_page_bottom(self):
        page=self.page(1280,900)
        page.locator('[data-cat=drinks]').click()
        page.wait_for_timeout(1200)
        self.assertEqual(page.locator('.m-tab.active').get_attribute('data-cat'),'drinks')

    def test_reduced_motion_and_missing_image(self):
        page=self.page(reduced_motion='reduce')
        page.route('**/images/products/duo-burger.jpg',lambda route:route.abort())
        page.locator('.m-card').first.click()
        page.locator('.m-modal-img-ph').wait_for()
        self.assertEqual(page.locator('.m-modal-img-ph').inner_text(),'الصورة غير متاحة')
        self.assertEqual(page.locator('#m-modal').evaluate('e=>getComputedStyle(e).transitionDuration'),'0s')
        page.keyboard.press('Escape')
        self.closed(page)


if __name__ == '__main__':
    unittest.main()
