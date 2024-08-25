#!/bin/sh

# تحديث pip و setuptools و wheel
pip install --upgrade pip setuptools wheel

# تثبيت الاعتماديات
pip install -r requirements.txt
