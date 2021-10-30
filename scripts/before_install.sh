#!/bin/bash

cd /home/erpuser/frappe-bench/apps
bench uninstall-app tag_workflow -y
sudo rm -rf /home/erpuser/frappe-bench/apps/tag_workflow