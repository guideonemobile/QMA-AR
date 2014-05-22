
#import "QMACyclopsVC.h"

#import "EAGLView.h"
#import <metaioSDK/GestureHandlerIOS.h>
#import <metaioSDK/IARELInterpreterIOS.h>

#include "TargetConditionals.h"		// to know if we're building for SIMULATOR
#include <metaioSDK/IMetaioSDKIOS.h>
#include <metaioSDK/IARELInterpreterIOS.h>
#include <metaioSDK/GestureHandler.h>

#import "QMAPoiTBVC.h"


@interface QMACyclopsVC () <UIGestureRecognizerDelegate, IARELInterpreterIOSDelegate, UIWebViewDelegate>

@property (nonatomic, weak) IBOutlet EAGLView *glView;
@property (nonatomic, weak) IBOutlet UIWebView *m_arelWebView;

@property (nonatomic, weak) IBOutlet UIView *containerView;
@property (nonatomic, weak) QMAPoiTBVC *poiTBVC;

@end


@implementation QMACyclopsVC  {
    
    metaio::IARELInterpreterIOS *m_ArelInterpreter;
	GestureHandlerIOS *m_pGestureHandlerIOS;
	NSString *m_arelFile;
    
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
    //This message is only sent once. It is used by the container view to load its referencing view controller
    if ([segue.destinationViewController isKindOfClass:[QMAPoiTBVC class]]) {
        self.poiTBVC = segue.destinationViewController;
        self.poiTBVC.managedDocument = self.managedDocument;
    }
}

#pragma mark - AREL Callback

//This function is called from the AREL JavaScript code whenever targets start and stop being tracked
-(bool)openWebsiteWithUrl:(NSString *)url inExternalApp:(bool)openInExternalApp {
    
    //Sample "url" parameter:
    //targetUnloaded=Mattt
    
    NSArray *urlParts = [url componentsSeparatedByString:@"="];
    
    NSString *action = [urlParts firstObject];
    NSString *target = [urlParts lastObject];
    QMALog(@"%@ %@", action, target);
    
    return YES;
}

@end
