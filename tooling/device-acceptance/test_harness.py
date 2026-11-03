import contextlib
import copy
import io
import json
from pathlib import Path
import shutil
import unittest
from unittest.mock import patch

import harness


class SecurityPolicyTests(unittest.TestCase):
    def setUp(self):
        self.before = (harness.REPO / 'infrastructure/keycloak/realm-faji-m2.json').read_bytes()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            harness.initialize('ubuntu.synthetic.ts.net')
        self.state = Path(output.getvalue().strip())
        self.config = harness.load(self.state)
        self.compose = json.loads((self.state / 'compose.json').read_text())

    def tearDown(self):
        self.assertEqual(self.before, (harness.REPO / 'infrastructure/keycloak/realm-faji-m2.json').read_bytes())
        shutil.rmtree(self.state)

    def test_ports_never_listen_on_lan_or_public_interface(self):
        for service in self.compose['services'].values():
            for value in service.get('ports', []):
                self.assertTrue(value.startswith('127.0.0.1:'))

    def test_databases_have_tmpfs_and_no_reused_volume(self):
        self.assertNotIn('volumes', self.compose)
        for name in ['identitydb', 'appdb']:
            service = self.compose['services'][name]
            self.assertNotIn('volumes', service)
            self.assertTrue(service['tmpfs'][0].startswith('/var/lib/postgresql/data:'))
        self.assertNotEqual(self.compose['services']['identitydb']['networks'], self.compose['services']['api']['networks'])

    def test_unique_namespace_and_credentials(self):
        other = harness.plan('ubuntu.synthetic.ts.net')
        self.assertNotEqual(other['project'], self.config['project'])
        self.assertEqual(len(set(self.config['passwords'].values())), 4)
        self.assertTrue(set(self.config['passwords'].values()).isdisjoint(other['passwords'].values()))

    def test_modified_compose_rejected_before_any_docker_command(self):
        altered = copy.deepcopy(self.compose)
        altered['services']['appdb']['volumes'] = ['existing_db:/var/lib/postgresql/data']
        harness.write(self.state / 'compose.json', altered)
        with self.assertRaisesRegex(ValueError, 'drift'):
            harness.load(self.state)

    def test_state_permissions_and_marker_required(self):
        self.state.chmod(0o755)
        with self.assertRaises(ValueError):
            harness.load(self.state)
        self.state.chmod(0o700)
        c = {**self.config, 'marker': 'untrusted'}
        harness.write(self.state / 'state.json', c)
        with self.assertRaises(ValueError):
            harness.load(self.state)

    def test_native_security_and_exact_keycloak_version(self):
        self.assertEqual(self.compose['services']['keycloak']['image'], 'quay.io/keycloak/keycloak:26.8.1')
        self.assertEqual(self.compose['services']['keycloak']['command'][0], 'start')
        realm = json.loads((self.state / 'realm.json').read_text())
        self.assertTrue(realm['verifyEmail'])
        self.assertEqual(realm['smtpServer']['host'], 'mail')
        for client in realm['clients']:
            if client['clientId'] in ['faji-customer-mobile', 'faji-business-mobile']:
                self.assertEqual(client['attributes']['pkce.code.challenge.method'], 'S256')
                self.assertFalse(client['directAccessGrantsEnabled'])
                self.assertFalse(client['implicitFlowEnabled'])
                self.assertEqual(client['attributes']['post.logout.redirect.uris'], client['redirectUris'][0])
        customer = json.loads((self.state / 'customer.json').read_text())
        business = json.loads((self.state / 'business.json').read_text())
        self.assertTrue(customer['FAJI_CUSTOMER_OIDC_ISSUER'].startswith('https://'))
        self.assertEqual(business['USE_MOCK_SERVICES'], 'false')
        self.assertNotIn('secret', json.dumps(customer).lower())

    def test_invalid_hostname_fails_before_creating_state(self):
        with patch('harness.tempfile.mkdtemp') as create:
            for hostname in ['example.com', 'https://host.tail.ts.net', 'node.tail.ts.net;id', 'node.tail.ts.net/']:
                with self.assertRaises(ValueError):
                    harness.initialize(hostname)
            create.assert_not_called()

    def test_edge_hides_admin_and_disables_query_logging(self):
        nginx = (self.state / 'nginx.conf').read_text()
        self.assertIn('location / { return 404; }', nginx)
        self.assertIn('location /realms/faji/', nginx)
        self.assertNotIn('location /admin', nginx)
        self.assertIn('access_log off', nginx)
        self.assertIn('proxy_set_header X-Forwarded-Proto https', nginx)


if __name__ == '__main__':
    unittest.main()
