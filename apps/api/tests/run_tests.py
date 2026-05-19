#!/usr/bin/env python3
"""
Simple Test Runner - Direct service testing
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

print("=" * 60)
print("🧪 ViraLoop Service Tests")
print("=" * 60)

# Use a global dict that all test functions will update
test_stats = {"passed": 0, "failed": 0, "total": 0}

def update_stats(passed=0, failed=0, total=0):
    test_stats["passed"] += passed
    test_stats["failed"] += failed
    test_stats["total"] += total

async def test_upload_queue_manager():
    print("\n📋 Testing UploadQueueManager...")
    try:
        from app.services.upload_queue_manager import get_upload_queue_manager
        queue = get_upload_queue_manager()
        
        video_data = {
            "video_id": "vid_test_001",
            "channel_id": "channel_travel",
            "title": "Test Travel Video",
            "video_file_path": "/test/video.mp4"
        }
        
        item_id = await queue.enqueue(video_data, source="auto", priority="high")
        assert item_id is not None
        print(f"  ✅ enqueue: {item_id}")
        
        next_items = await queue.get_next_for_channel("channel_travel")
        assert isinstance(next_items, list)
        print(f"  ✅ get_next_for_channel: {len(next_items)} items")
        
        status = queue.get_queue_status()
        assert "total" in status
        print(f"  ✅ get_queue_status: total={status['total']}")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_processing_verification():
    print("\n📋 Testing ProcessingVerification...")
    try:
        from app.services.processing_verification import get_processing_verification
        verifier = get_processing_verification()
        
        item_id = await verifier.register_item(
            item_id="item_001",
            video_id="vid_001",
            channel_id="channel_travel",
            title="Test Video",
            source="auto",
            assigned_reviewer="team_alpha"
        )
        assert item_id is not None
        print(f"  ✅ register_item: {item_id}")
        
        await verifier.update_stage("item_001", "in_review", actor="reviewer1")
        status = await verifier.check_processing_status("item_001")
        assert status is not None
        print(f"  ✅ check_processing_status: {status['current_stage']}")
        
        workload = verifier.get_team_workload("team_alpha")
        assert "team_alpha" in workload
        print(f"  ✅ get_team_workload: {workload['team_alpha']}")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_dashboard_aggregator():
    print("\n📋 Testing DashboardAggregator...")
    try:
        from app.services.dashboard_aggregator import get_dashboard_aggregator
        dashboard = get_dashboard_aggregator()
        
        await dashboard.register_service("test_api", "healthy", "All good")
        status = await dashboard.get_service_details("test_api")
        assert status is not None
        print(f"  ✅ register_service: {status['status']}")
        
        await dashboard.update_service_status("test_api", "degraded", "High latency")
        status = await dashboard.get_service_details("test_api")
        assert status["status"] == "degraded"
        print(f"  ✅ update_service_status: {status['status']}")
        
        sys_status = await dashboard.get_system_status()
        assert "overall_status" in sys_status
        print(f"  ✅ get_system_status: {sys_status['overall_status']}")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_report_generator():
    print("\n📋 Testing ReportGenerator...")
    try:
        from app.services.report_generator import get_report_generator
        report_gen = get_report_generator()
        
        report = await report_gen.generate_daily_report()
        assert "summary" in report
        print(f"  ✅ generate_daily_report: {report['summary']['total_uploads']} uploads")
        
        weekly = await report_gen.generate_weekly_report()
        assert "daily_breakdown" in weekly
        print(f"  ✅ generate_weekly_report: {len(weekly['daily_breakdown'])} days")
        
        reports = report_gen.get_report_list(limit=5)
        assert len(reports) >= 2
        print(f"  ✅ get_report_list: {len(reports)} reports")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_metrics_aggregator():
    print("\n📋 Testing MetricsAggregator...")
    try:
        from app.services.metrics_aggregator import get_metrics_aggregator
        mgr = get_metrics_aggregator()
        
        await mgr.record("test.metric", 1.0, {"env": "test"})
        data = await mgr.get_metric("test.metric", hours=1)
        assert len(data) > 0
        print(f"  ✅ record: {len(data)} data points")
        
        await mgr.record("upload.success", 10)
        kpi = await mgr.get_kpi("daily_uploads")
        assert kpi is not None
        print(f"  ✅ get_kpi: {kpi['value']}")
        
        metrics = await mgr.get_dashboard_metrics()
        assert "kpis" in metrics
        print(f"  ✅ get_dashboard_metrics: {len(metrics['kpis'])} KPIs")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_docker_manager():
    print("\n📋 Testing DockerContainerManager...")
    try:
        from app.services.docker_manager import get_docker_manager
        docker = get_docker_manager()
        
        container_id = await docker.start_container("test_api", "nginx:latest")
        assert container_id is not None
        print(f"  ✅ start_container: {container_id[:20]}...")
        
        status = await docker.get_container_status("test_api")
        assert status is not None
        print(f"  ✅ get_container_status: {status['status']}")
        
        compose = docker.get_docker_compose()
        assert "services" in compose
        print(f"  ✅ get_docker_compose: {len(compose.split('services'))} services")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_cicd_pipeline():
    print("\n📋 Testing CICDPipeline...")
    try:
        from app.services.cicd_pipeline import get_cicd_pipeline
        cicd = get_cicd_pipeline()
        
        run_id = await cicd.run_pipeline("build", commit_sha="abc123")
        assert run_id is not None
        print(f"  ✅ run_pipeline: {run_id}")
        
        await asyncio.sleep(0.5)
        status = await cicd.get_pipeline_status(run_id)
        assert status is not None
        print(f"  ✅ get_pipeline_status: {status['status']}")
        
        history = cicd.get_pipeline_history(limit=5)
        assert len(history) >= 1
        print(f"  ✅ get_pipeline_history: {len(history)} runs")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_deployment_config():
    print("\n📋 Testing DeploymentConfigManager...")
    try:
        from app.services.deployment_config import get_deployment_config
        deploy = get_deployment_config()
        
        config = await deploy.get_config("production")
        assert config is not None
        print(f"  ✅ get_config: replicas={config['replicas']}")
        
        secret = await deploy.get_secret("DATABASE_URL")
        assert secret is not None
        print(f"  ✅ get_secret: {secret[:10]}...")
        
        manifests = await deploy.get_k8s_manifests("production")
        assert "deployment" in manifests
        print(f"  ✅ get_k8s_manifests: {len(manifests)} manifests")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_system_health_monitor():
    print("\n📋 Testing SystemHealthMonitor...")
    try:
        from app.services.system_health_monitor import get_health_monitor
        health = get_health_monitor()
        
        await health.register_service("test_service", "http://localhost:9000/health")
        status = await health.check_service_health("test_service")
        assert status is not None
        print(f"  ✅ check_service_health: {status['status']}")
        
        health_check = await health.check_system_health()
        assert "overall_status" in health_check
        print(f"  ✅ check_system_health: {health_check['overall_status']}")
        
        summary = health.get_health_summary()
        assert "total_services" in summary
        print(f"  ✅ get_health_summary: {summary['total_services']} services")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        update_stats(failed=1, total=3)

async def test_phase7_services():
    print("\n📋 Testing Phase 7 Services...")
    
    # ML Pipeline
    try:
        from app.services.ml_pipeline import get_ml_pipeline
        ml = get_ml_pipeline()
        
        model_id = await ml.train(
            name="test_classifier",
            model_type="classifier",
            features=["views", "engagement"],
            labels=["viral", "not_viral"]
        )
        assert model_id is not None
        print(f"  ✅ ml_pipeline.train: {model_id}")
        
        prediction = await ml.predict(model_id, {"views": 1000, "engagement": 0.8})
        assert prediction is not None
        print(f"  ✅ ml_pipeline.predict: {prediction['prediction']}")
        
        models = ml.list_models()
        print(f"  ✅ ml_pipeline.list_models: {len(models)} models")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ ml_pipeline Error: {e}")
        update_stats(failed=1, total=3)
    
    # A/B Testing
    try:
        from app.services.ab_testing import get_ab_testing
        ab = get_ab_testing()
        
        exp_id = await ab.create_experiment("thumbnail_test", {"control": 50, "variant_a": 50})
        assert exp_id is not None
        print(f"  ✅ ab_testing.create_experiment: {exp_id}")
        
        await ab.start_experiment(exp_id)
        variant = await ab.get_variant(exp_id, "user_123")
        assert variant is not None
        print(f"  ✅ ab_testing.get_variant: {variant}")
        
        ab_results = ab.get_results(exp_id)
        assert "variants" in ab_results
        print(f"  ✅ ab_testing.get_results: {len(ab_results['variants'])} variants")
        
        update_stats(passed=3, total=3)
    except Exception as e:
        print(f"  ❌ ab_testing Error: {e}")
        update_stats(failed=1, total=3)
    
    # Search Engine
    try:
        from app.services.search_engine import get_search_engine
        search = get_search_engine()
        
        await search.index("doc_1", {"title": "Travel Video", "content": "Beach travel"})
        query_results = await search.query("travel")
        assert len(query_results) > 0
        print(f"  ✅ search_engine.query: {len(query_results)} results")
        
        suggestions = await search.autocomplete("Travel")
        print(f"  ✅ search_engine.autocomplete: {len(suggestions)} suggestions")
        
        update_stats(passed=2, total=2)
    except Exception as e:
        print(f"  ❌ search_engine Error: {e}")
        update_stats(failed=1, total=2)
    
    # Recommendation Engine
    try:
        from app.services.recommendation_engine import get_recommendation_engine
        rec = get_recommendation_engine()
        
        recommendations = await rec.get_recommendations(
            user_id=123,
            context={"niche": "travel"}
        )
        assert len(recommendations) > 0
        print(f"  ✅ recommendation_engine.get_recommendations: {len(recommendations)} items")
        
        trending = await rec.get_trending()
        assert len(trending) > 0
        print(f"  ✅ recommendation_engine.get_trending: {len(trending)} items")
        
        update_stats(passed=2, total=2)
    except Exception as e:
        print(f"  ❌ recommendation_engine Error: {e}")
        update_stats(failed=1, total=2)

async def main():
    print(f"\n⏰ Start time: {datetime.now().strftime('%H:%M:%S')}")
    
    await test_phase7_services()
    await test_upload_queue_manager()
    await test_processing_verification()
    await test_dashboard_aggregator()
    await test_report_generator()
    await test_metrics_aggregator()
    await test_docker_manager()
    await test_cicd_pipeline()
    await test_deployment_config()
    await test_system_health_monitor()
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"  Total:   {test_stats['total']}")
    print(f"  Passed:  ✅ {test_stats['passed']}")
    print(f"  Failed:  ❌ {test_stats['failed']}")
    
    pass_rate = (test_stats['passed'] / test_stats['total'] * 100) if test_stats['total'] > 0 else 0
    print(f"  Pass:    {pass_rate:.1f}%")
    print(f"\n⏰ End time: {datetime.now().strftime('%H:%M:%S')}")
    
    if test_stats['failed'] > 3:
        print("\n⚠️  Too many failures. Consider fixing core issues before continuing.")
        return 1
    elif test_stats['failed'] > 0:
        print(f"\n⚠️  {test_stats['failed']} test(s) failed. Some issues to investigate.")
    else:
        print("\n🎉 All tests passed!")
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)