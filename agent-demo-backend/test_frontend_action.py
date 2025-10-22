#!/usr/bin/env python3
"""
Test script for /api/frontend-action endpoint

This simulates how the AWS Strands agent will call the backend.
Make sure both backend and frontend are running before testing.
"""

import requests
import json
import time

BACKEND_URL = "http://localhost:8000"

def test_create_task():
    """Test creating a task"""
    print("\n=== Testing create_task ===")
    
    payload = {
        "action": "create_task",
        "parameters": {
            "title": "Test task from agent",
            "description": "This task was created via the frontend-action API",
            "priority": "high",
            "tags": ["test", "api"]
        }
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/frontend-action",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success!")
        print(f"Response: {json.dumps(result, indent=2)}")
        
        return result.get('data', {}).get('task_id')
    
    except requests.exceptions.Timeout:
        print("❌ Request timed out (frontend might not be connected)")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
    
    return None


def test_get_tasks():
    """Test getting all tasks"""
    print("\n=== Testing get_tasks ===")
    
    payload = {
        "action": "get_tasks",
        "parameters": {}
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/frontend-action",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success!")
        print(f"Found {result.get('data', {}).get('count', 0)} tasks")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def test_complete_task(task_id):
    """Test completing a task"""
    if not task_id:
        print("\n⏭️  Skipping complete_task (no task_id)")
        return
    
    print(f"\n=== Testing complete_task (ID: {task_id}) ===")
    
    payload = {
        "action": "complete_task",
        "parameters": {
            "task_id": task_id
        }
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/frontend-action",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success!")
        print(f"Response: {json.dumps(result, indent=2)}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def test_bulk_create():
    """Test bulk creating tasks"""
    print("\n=== Testing bulk_create_tasks ===")
    
    payload = {
        "action": "bulk_create_tasks",
        "parameters": {
            "tasks": [
                {
                    "title": "Morning task 1",
                    "priority": "medium"
                },
                {
                    "title": "Morning task 2",
                    "priority": "medium"
                },
                {
                    "title": "Morning task 3",
                    "priority": "low"
                }
            ]
        }
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/frontend-action",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success!")
        print(f"Created {result.get('data', {}).get('count', 0)} tasks")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def test_analyze_workload():
    """Test workload analysis"""
    print("\n=== Testing analyze_workload ===")
    
    payload = {
        "action": "analyze_workload",
        "parameters": {}
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/frontend-action",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success!")
        analysis = result.get('data', {}).get('analysis', {})
        print(f"Total tasks: {analysis.get('total_tasks', 0)}")
        print(f"Pending: {analysis.get('pending_tasks', 0)}")
        print(f"Completed today: {analysis.get('completed_today', 0)}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def main():
    print("=" * 60)
    print("Frontend Action API Test")
    print("=" * 60)
    print("\nMake sure:")
    print("1. Backend is running: uvicorn main:socket_app --port 8000")
    print("2. Frontend is running: npm run dev")
    print("3. Frontend is open in browser at /my-todo")
    print("\nPress Enter to start tests...")
    input()
    
    # Run tests
    task_id = test_create_task()
    time.sleep(1)
    
    test_get_tasks()
    time.sleep(1)
    
    test_bulk_create()
    time.sleep(1)
    
    test_analyze_workload()
    time.sleep(1)
    
    test_complete_task(task_id)
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
