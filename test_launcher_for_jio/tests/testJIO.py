from unittest import TestCase
import subprocess
import os

class JIOTest(TestCase):

  def setUp(self):
    pass

  def tearDown(self):
    pass

  def test_01_jio_without_requirejs(self):
    """
    Launch jio test without requirejs
    """
    command = ["%s %s %s; exit 0" % (
          os.path.expanduser('~/bin/phantomjs'),
          os.path.expanduser('~/parts/jio/test/run-qunit.js'),
          os.path.expanduser('~/parts/jio/test/jiotests_withoutrequirejs.html'))]
    print command
    result = subprocess.check_output(
       command,
       stderr=subprocess.STDOUT,
       shell=True)
    print result
    self.assertTrue(result.find("assertions of")>=0)
    # we should have string like 443 assertions of 444 passed, 1 failed.
    total_quantity = 0
    passed_quantity = 0
    failed_quantity = 0
    for line in result.split('\n'):
      if line.find("assertions of") >=0:
        splitted_line = line.split()
        passed_quantity = splitted_line[0]
        total_quantity = splitted_line[3]
        failed_quantity = splitted_line[5]
    self.assertTrue(total_quantity > 0)
    print "\nJIO SUB RESULT: %s Tests, %s Failures" % (total_quantity,
          failed_quantity)
