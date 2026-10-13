<?php

namespace Tests\Feature;

use Tests\TestCase;

class WebsiteTest extends TestCase
{
    public function test_main_domain_shows_the_public_website_with_all_sections(): void
    {
        $response = $this->get('/')->assertOk();

        foreach (['id="home"', 'id="about"', 'id="services"', 'id="career"', 'id="contact"'] as $section) {
            $response->assertSee($section, false);
        }
        $response->assertSee('href="/client"', false)
            ->assertSee('href="/register"', false)
            ->assertDontSee('rel="manifest"', false)
            ->assertDontSee('/admin', false);
    }

    public function test_old_installed_app_start_url_goes_to_the_staff_app(): void
    {
        $this->get('/?source=pwa')->assertRedirect('/staff');
    }
}
