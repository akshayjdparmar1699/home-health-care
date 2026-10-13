<?php

namespace Tests\Feature;

use Tests\TestCase;

class InstallManifestTest extends TestCase
{
    public function test_admin_pages_link_the_admin_app_manifest(): void
    {
        foreach (['/admin', '/admin/login', '/admin/attendance'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('href="/manifest-admin.webmanifest"', false)
                ->assertSee('content="YH Admin"', false);
        }
    }

    public function test_staff_pages_link_the_staff_app_manifest(): void
    {
        foreach (['/staff', '/staff/login', '/register', '/client/register'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('href="/manifest.webmanifest"', false)
                ->assertDontSee('manifest-admin', false);
        }
    }

    public function test_the_two_apps_have_different_ids_and_scopes(): void
    {
        $staff = json_decode(file_get_contents(public_path('manifest.webmanifest')), true);
        $admin = json_decode(file_get_contents(public_path('manifest-admin.webmanifest')), true);

        $this->assertNotSame($staff['id'], $admin['id']);
        $this->assertSame('/admin', $admin['scope']);
        $this->assertStringStartsWith('/admin', $admin['start_url']);
        $this->assertStringStartsWith('/staff', $staff['start_url']);
    }
}
