
#import "QMACyclopsVC.h"

#import "EAGLView.h"
#import <metaioSDK/GestureHandlerIOS.h>
#import <metaioSDK/IARELInterpreterIOS.h>

#include "TargetConditionals.h"		// to know if we're building for SIMULATOR
#include <metaioSDK/IMetaioSDKIOS.h>
#include <metaioSDK/IARELInterpreterIOS.h>
#include <metaioSDK/GestureHandler.h>

#import "QMAPoiTBVC.h"
#import "QMATarget.h"
#import "QMAPoiDisplayVC.h"
#import "QMAPoi.h"
#import "UIImage+ImageEffects.h"


@interface QMACyclopsVC () <UIGestureRecognizerDelegate,
                            IARELInterpreterIOSDelegate,
                            UIWebViewDelegate,
                            QMAPoiTBVCDelegate>

@property (nonatomic, weak) IBOutlet EAGLView *glView;
@property (nonatomic, weak) IBOutlet UIWebView *m_arelWebView;

@property (nonatomic, weak) IBOutlet UIView *containerView;
@property (nonatomic, weak) QMAPoiTBVC *poiTBVC;

@end


@implementation QMACyclopsVC  {
    
    metaio::IARELInterpreterIOS *m_ArelInterpreter;
	GestureHandlerIOS *m_pGestureHandlerIOS;
	NSString *m_arelFile;
    
    __weak QMAPoi *_selectedPOI;
    
}

#pragma mark - Metaio Boilerplate Code

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.m_arelWebView.scrollView.bounces = NO;
    
    m_arelFile = [[NSString alloc] initWithString:[[NSBundle mainBundle] pathForResource:@"index"
                                                                                  ofType:@"xml"
                                                                             inDirectory:@"Assets"]];
	
    m_pGestureHandlerIOS = [[GestureHandlerIOS alloc] initWithSDK:m_metaioSDK
														 withView:self.m_arelWebView
													 withGestures:metaio::GestureHandler::GESTURE_ALL];
    
    m_ArelInterpreter = metaio::CreateARELInterpreterIOS(self.m_arelWebView, self);
	
    m_ArelInterpreter->initialize(m_metaioSDK, m_pGestureHandlerIOS->m_pGestureHandler);
    
    m_ArelInterpreter->setRadarProperties(metaio::IGeometry::ANCHOR_TL, metaio::Vector3d(1), metaio::Vector3d(1));
	
	m_ArelInterpreter->registerDelegate(self);
}

- (void)viewDidLayoutSubviews {
	float scale = [UIScreen mainScreen].scale;
	m_metaioSDK->resizeRenderer(self.glView.bounds.size.width*scale, self.glView.bounds.size.height*scale);
}

- (void)onSDKReady {
	m_ArelInterpreter->loadARELFile([m_arelFile UTF8String]);
}

- (void)drawFrame {
    
	[glView setFramebuffer];
    
    if (m_ArelInterpreter) {
		m_ArelInterpreter->update();
    }
    
    [glView presentFramebuffer];
}

#pragma mark - Prepare for Segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    
    if ([segue.destinationViewController isKindOfClass:[QMAPoiTBVC class]]) {
        self.poiTBVC = segue.destinationViewController;
        self.poiTBVC.delegate = self;
        self.poiTBVC.managedDocument = self.managedDocument;
    
    } else if ([segue.destinationViewController isKindOfClass:[QMAPoiDisplayVC class]]) {
        QMAPoiDisplayVC *vc = segue.destinationViewController;
        vc.currentPOI = _selectedPOI;
        vc.panoramaScreenShot = [self blurredScreenShot];
    }
}

#pragma mark - Screen Shot With Blur

- (UIImage *)blurredScreenShot{
    
    UIGraphicsBeginImageContextWithOptions(self.glView.frame.size, NO, self.glView.window.screen.scale);
    
    [self.glView drawViewHierarchyInRect:self.glView.frame afterScreenUpdates:NO];

    UIImage *snapshotImage = UIGraphicsGetImageFromCurrentImageContext();
    UIImage *blurredSnapshotImage = [snapshotImage applyDarkEffect];

    
    // Or apply any other effects available in "UIImage+ImageEffects.h"
    // UIImage *blurredSnapshotImage = [snapshotImage applyDarkEffect];
    // UIImage *blurredSnapshotImage = [snapshotImage applyExtraLightEffect];
    
    UIGraphicsEndImageContext();
    
    return blurredSnapshotImage;
}

#pragma mark - AREL Callback

//This function is called from the AREL JavaScript code whenever targets start and stop being tracked
-(bool)openWebsiteWithUrl:(NSString *)url inExternalApp:(bool)openInExternalApp {
    
    //Sample "url" parameter:
    //targetTrackStarted=CentralPark
    //targetTrackEnded=CentralPark
    
    NSArray *urlParts = [[url lastPathComponent] componentsSeparatedByString:@"="];
    NSString *action = [urlParts firstObject];
    NSString *targetString = [urlParts lastObject];
    
    if ([action isEqualToString:@"targetTrackStarted"]) {
        NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMATarget"];
        request.predicate = [NSPredicate predicateWithFormat:@"label = %@", targetString];
        NSArray *matches = [self.managedDocument.managedObjectContext executeFetchRequest:request error:nil];
        if (!matches) {
            QMALog(@"Error: Fetch request failed");
        } else if ([matches count] > 1) {
            QMALog(@"Error: More than one target with the same name: %@", targetString);
        } else if ([matches count] == 0) {
            QMALog(@"No target named '%@' in the database", targetString);
        } else {
            self.poiTBVC.target = [matches firstObject];
        }
        
    } else if ([action isEqualToString:@"targetTrackEnded"]) {
        self.poiTBVC.target = nil;
    } else {
        QMALog(@"Action '%@' does not match anything we are expecting", action);
    }
    
    return YES;
}

#pragma mark - QMAPoiTBVCDelegate

- (void)qmaPoiTBC:(QMAPoiTBVC *)qmaPoiTBC didSelectPOI:(QMAPoi *)poi {
    _selectedPOI = poi;
    [self performSegueWithIdentifier:@"SegueToPoiDisplay" sender:self];
}

@end
