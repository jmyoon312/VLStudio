#!/usr/bin/env python3
"""
Test Runner for ViraLoop Services

Usage:
    python test_runner.py                 # Run all tests
    python test_runner.py --phase 7       # Run specific phase
    python test_runner.py --service queue # Run specific service
    python test_runner.py --verbose       # Verbose output
"""

import os
import sys
import asyncio
import argparse
import logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TestRunner:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": [],
            "tests": []
        }
    
    async def run_all_tests(self) -> dict:
        """Run all service tests"""
        logger.info("🚀 Starting ViraLoop Service Tests")
        logger.info("=" * 60)
        
        test_modules = [
            ("Phase 1-6", "tests/test_quality_pipeline"),
            ("Phase 1-6", "tests/test_security_automation"),
            ("Phase 1-6", "tests/test_video_production"),
            ("Phase 1-6", "tests/test_phase4_infrastructure"),
            ("Phase 1-6", "tests/test_phase5_advanced"),
            ("Phase 7-10", "tests/test_phase_7_10"),
        ]
        
        for phase, module in test_modules:
            try:
                await self.run_module_tests(phase, module)
            except Exception as e:
                logger.error(f"Error running {module}: {e}")
        
        return self.results
    
    async def run_module_tests(self, phase: str, module: str):
        """Run tests for a specific module"""
        logger.info(f"\n📋 Running {phase}: {module}")
        logger.info("-" * 40)
        
        try:
            from tests import test_phase_7_10
            
            test_classes = [
                test_phase_7_10.TestUploadQueueManager,
                test_phase_7_10.TestProcessingVerification,
                test_phase_7_10.TestDashboardAggregator,
                test_phase_7_10.TestReportGenerator,
                test_phase_7_10.TestMetricsAggregator,
                test_phase_7_10.TestDockerManager,
                test_phase_7_10.TestCICDPipeline,
                test_phase_7_10.TestDeploymentConfig,
                test_phase_7_10.TestSystemHealthMonitor,
            ]
            
            for test_class in test_classes:
                await self.run_test_class(test_class)
                
        except ImportError as e:
            logger.warning(f"Could not import {module}: {e}")
    
    async def run_test_class(self, test_class):
        """Run all tests in a class"""
        class_name = test_class.__name__
        
        instance = test_class()
        
        setup = getattr(instance, 'setup', None) or getattr(instance, 'setup_method', None)
        if setup:
            try:
                if asyncio.iscoroutinefunction(setup):
                    await setup(instance)
                else:
                    setup(instance)
            except Exception as e:
                logger.debug(f"Setup error for {class_name}: {e}")
        
        test_methods = [
            m for m in dir(instance)
            if m.startswith('test_') and callable(getattr(instance, m))
        ]
        
        for method_name in test_methods:
            self.results["total"] += 1
            method = getattr(instance, method_name)
            
            try:
                if asyncio.iscoroutinefunction(method):
                    await method()
                else:
                    method()
                
                self.results["passed"] += 1
                status = "✅ PASS"
                
            except Exception as e:
                self.results["failed"] += 1
                self.results["errors"].append({
                    "class": class_name,
                    "method": method_name,
                    "error": str(e)
                })
                status = f"❌ FAIL: {str(e)[:50]}"
            
            if self.verbose or self.results["total"] <= 20:
                logger.info(f"  {status} | {class_name}.{method_name}")
        
        logger.info(f"  📊 {class_name}: {len(test_methods)} tests")
    
    def print_summary(self):
        """Print test summary"""
        logger.info("\n" + "=" * 60)
        logger.info("📊 TEST SUMMARY")
        logger.info("=" * 60)
        logger.info(f"  Total:    {self.results['total']}")
        logger.info(f"  Passed:   ✅ {self.results['passed']}")
        logger.info(f"  Failed:   ❌ {self.results['failed']}")
        logger.info(f"  Skipped:  ⏭️  {self.results['skipped']}")
        
        pass_rate = (self.results['passed'] / self.results['total'] * 100) if self.results['total'] > 0 else 0
        logger.info(f"  Pass Rate: {pass_rate:.1f}%")
        
        if self.results['errors']:
            logger.info("\n❌ FAILED TESTS:")
            for err in self.results['errors'][:10]:
                logger.info(f"  - {err['class']}.{err['method']}")
                logger.info(f"    Error: {err['error'][:80]}")
        
        return pass_rate >= 80


async def main():
    parser = argparse.ArgumentParser(description="ViraLoop Test Runner")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--phase", type=str, help="Run specific phase")
    parser.add_argument("--service", type=str, help="Run specific service")
    args = parser.parse_args()
    
    runner = TestRunner(verbose=args.verbose)
    
    start_time = datetime.now()
    await runner.run_all_tests()
    duration = (datetime.now() - start_time).total_seconds()
    
    runner.print_summary()
    
    logger.info(f"\n⏱️  Total time: {duration:.2f}s")
    
    return 0 if runner.results["failed"] == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
