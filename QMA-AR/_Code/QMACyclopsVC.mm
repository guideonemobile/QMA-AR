
#import "QMACyclopsVC.h"

#import "EAGLView.h"
#import <metaioSDK/GestureHandlerIOS.h>
#import <metaioSDK/IARELInterpreterIOS.h>

#include "TargetConditionals.h"		// to know if we're building for SIMULATOR
#include <metaioSDK/IMetaioSDKIOS.h>
#include <metaioSDK/IARELInterpreterIOS.h>
#include <metaioSDK/GestureHandler.h>
#import <UIKit/UIGestureRecognizerSubclass.h>

#import "QMAMenuTBVC.h"
#import "QMAPoiTBVC.h"
#import "QMATarget.h"
#import "QMAPoiDisplayVC.h"
#import "QMAPoi.h"
#import "UIImage+ImageEffects.h"
#import "QMAWebViewController.h"


//<------------------------------------------------------------------------------------


#pragma mark - Metaio Touch Event Boilerplate Code

@interface MetaioTouchesRecognizer : UIGestureRecognizer {
    UIViewController *theLiveViewController;
}
@end

@implementation MetaioTouchesRecognizer

- (void)setTheLiveViewController:(UIViewController *)controller {
    theLiveViewController = controller;
}

- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event {
    if (theLiveViewController) {
        [theLiveViewController touchesBegan:touches withEvent:event];
    }
}

- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event {
    if (theLiveViewController && ([self numberOfTouches] == 1) ) {
        [theLiveViewController touchesMoved:touches withEvent:event];
    }
}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event {
    if (theLiveViewController) {
        [theLiveViewController touchesEnded:touches withEvent:event];
    }
}

@end


//<------------------------------------------------------------------------------------


@interface QMACyclopsVC () <UIGestureRecognizerDelegate,
                            IARELInterpreterIOSDelegate,
                            UIWebViewDelegate,
                            QMAPoiTBVCDelegate,
                            QMAMenuTBVCDelegate>

@property (nonatomic, weak) IBOutlet EAGLView *glView;
@property (nonatomic, weak) IBOutlet UIWebView *m_arelWebView;

@property (nonatomic, weak) IBOutlet UIView *menuContainerView;
@property (nonatomic, weak) IBOutlet UIButton *menuButton;

@property (nonatomic, weak) QMAMenuTBVC *menuTBVC;
@property (nonatomic, weak) QMAPoiTBVC *poiTBVC;

@end


static const BOOL kHideTableViewWithPOIs = YES;

static NSString *const kQMAURL = @"http://www.queensmuseum.org/";
static NSString *const kAboutThePanoramaHTMLFile = @"centralPark-2.html";
static NSString *const kShareReviewHTMLFile = @"centralPark-1.html";
static NSString *const kCreditsHTMLFile = @"centralPark-2.html";

typedef NS_ENUM(NSUInteger, MenuSelectionState) {
    MenuSelectionStateAboutThePanorama,
    MenuSelectionStateShareReview,
    MenuSelectionStateCredits,
};


@implementation QMACyclopsVC  {
    
    metaio::IARELInterpreterIOS *m_ArelInterpreter;
	GestureHandlerIOS *m_pGestureHandlerIOS;
	NSString *m_arelFile;
    
    __weak QMAPoi *_selectedPOI;
    BOOL _engineHasLoaded;
    
    
    MenuSelectionState _menuSelection;
}

#pragma mark - Metaio Boilerplate Code

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.menuButton.hidden = YES;
    
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
    
    MetaioTouchesRecognizer *recognizer = [[MetaioTouchesRecognizer alloc] init];
	[recognizer setTheLiveViewController:self];
    [recognizer setDelegate:self];
	[self.m_arelWebView addGestureRecognizer:recognizer];
}

- (void)viewDidLayoutSubviews {
	float scale = [UIScreen mainScreen].scale;
	m_metaioSDK->resizeRenderer(self.glView.bounds.size.width*scale, self.glView.bounds.size.height*scale);
}

- (void)onSDKReady {
	m_ArelInterpreter->loadARELFile([m_arelFile UTF8String]);
    _engineHasLoaded = YES;
    self.menuButton.hidden = NO;
}

- (void)drawFrame {
	[glView setFramebuffer];
    if (m_ArelInterpreter) {
		m_ArelInterpreter->update();
    }
    [glView presentFramebuffer];
}

- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event {
    [m_pGestureHandlerIOS touchesBegan:touches withEvent:event withView:glView];
}

- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event {
	[m_pGestureHandlerIOS touchesMoved:touches withEvent:event withView:glView];
}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event {
    [m_pGestureHandlerIOS touchesEnded:touches withEvent:event withView:glView];
}

#pragma mark - View Will Appear

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self hideMenuAnimated:NO];
    if (_engineHasLoaded) {
        self.menuButton.hidden = NO;
    }
}

#pragma mark - Menu

- (IBAction)didTapToShowMenu:(UIButton *)sender {
    [self showMenuAnimated:YES];
    sender.hidden = YES;
}

- (void)hideMenuAnimated:(BOOL)animated {
    [UIView animateWithDuration:(animated ? 0.3 : 0)
                          delay:0
                        options:UIViewAnimationOptionCurveEaseOut
                     animations:^{
                         //CGSize size = self.menuContainerView.frame.size;
                         //self.menuContainerView.frame = CGRectMake(0, -size.height, size.width, size.height);
                         CGSize size = self.menuContainerView.frame.size;
                         self.glView.frame = CGRectMake(0, 0, self.view.frame.size.width, size.height);
                     }
                     completion:^(BOOL finished) {
                     }
     ];
}

- (void)showMenuAnimated:(BOOL)animated {
    [UIView animateWithDuration:(animated ? 0.3 : 0)
                          delay:0
                        options:UIViewAnimationOptionCurveEaseOut
                     animations:^{
                         //CGSize size = self.menuContainerView.frame.size;
                         //self.menuContainerView.frame = CGRectMake(0, 0, size.width, size.height);
                         CGSize size = self.menuContainerView.frame.size;
                         self.glView.frame = CGRectMake(size.width, 0, self.view.frame.size.width-size.width, size.height);
                     }
                     completion:^(BOOL finished) {
                     }
     ];
}

#pragma mark - QMAMenuTBVCDelegate

- (void)qmaMenuDidTapToClose:(QMAMenuTBVC *)qmaMenu {
    [self hideMenuAnimated:YES];
    self.menuButton.hidden = NO;
}

- (void)qmaMenuDidTapToViewAboutPage:(QMAMenuTBVC *)qmaMenu {
    [self hideMenuAnimated:YES];
    _menuSelection = MenuSelectionStateAboutThePanorama;
    [self performSegueWithIdentifier:@"SegueToWebView" sender:self];
}

- (void)qmaMenuDidTapToViewQMA:(QMAMenuTBVC *)qmaMenu {
    [self hideMenuAnimated:YES];
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:kQMAURL]];
}

- (void)qmaMenuDidTapToShareReview:(QMAMenuTBVC *)qmaMenu {
    _menuSelection = MenuSelectionStateShareReview;
    [self performSegueWithIdentifier:@"SegueToWebView" sender:self];
}

- (void)qmaMenuDidTapToViewCredits:(QMAMenuTBVC *)qmaMenu {
    _menuSelection = MenuSelectionStateCredits;
    [self performSegueWithIdentifier:@"SegueToWebView" sender:self];
}

#pragma mark - Prepare for Segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {

    if ([segue.destinationViewController isKindOfClass:[QMAMenuTBVC class]]) {
        self.menuTBVC = segue.destinationViewController;
        self.menuTBVC.delegate = self;
    
    } else if ([segue.destinationViewController isKindOfClass:[QMAPoiTBVC class]]) {
        self.poiTBVC = segue.destinationViewController;
        self.poiTBVC.delegate = self;
        self.poiTBVC.managedDocument = self.managedDocument;
        self.poiTBVC.view.hidden = kHideTableViewWithPOIs;
    
    } else if ([segue.destinationViewController isKindOfClass:[QMAPoiDisplayVC class]]) {
        QMAPoiDisplayVC *vc = segue.destinationViewController;
        vc.currentPOI = _selectedPOI;
        vc.panoramaScreenShot = [self blurredScreenShot];
    
    } else if ([segue.destinationViewController isKindOfClass:[QMAWebViewController class]]) {
        
        QMAWebViewController *dVC = (QMAWebViewController *) segue.destinationViewController;
        
        if (_menuSelection == MenuSelectionStateAboutThePanorama) {
            dVC.htmlFileName = kAboutThePanoramaHTMLFile;
        } else if (_menuSelection == MenuSelectionStateShareReview) {
            dVC.htmlFileName = kShareReviewHTMLFile;
        } else if (_menuSelection == MenuSelectionStateCredits) {
            dVC.htmlFileName = kCreditsHTMLFile;
        }
    }
}

#pragma mark - Screen Shot With Blur

- (UIImage *)blurredScreenShot{
    
    UIGraphicsBeginImageContextWithOptions(self.glView.frame.size, NO, self.glView.window.screen.scale);
    
    [self.glView drawViewHierarchyInRect:self.glView.frame afterScreenUpdates:NO];
    UIImage *snapshotImage = UIGraphicsGetImageFromCurrentImageContext();
    UIImage *blurredSnapshotImage = [snapshotImage applyDarkEffect];
    
    UIGraphicsEndImageContext();
    
    return blurredSnapshotImage;
}

#pragma mark - AREL Callback

//This function is called from the AREL JavaScript code whenever targets start and stop being tracked
//as well as when the user taps on a POI

-(bool)openWebsiteWithUrl:(NSString *)url inExternalApp:(bool)openInExternalApp {
    
    //Sample "url" parameters:
    
    //targetTrackStarted=CentralPark
    //targetTrackEnded=CentralPark
    
    //poiTouchEnded=CentralPark-1'
    
    NSArray *urlParts = [[url lastPathComponent] componentsSeparatedByString:@"="];
    NSString *action = [urlParts firstObject];
    NSString *paramValue = [urlParts lastObject];
    
    if ([action isEqualToString:@"targetTrackStarted"]) {
        
        NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMATarget"];
        request.predicate = [NSPredicate predicateWithFormat:@"label = %@", paramValue];
        NSArray *matches = [self.managedDocument.managedObjectContext executeFetchRequest:request error:nil];
        
        if (!matches) {
            QMALog(@"Error: Fetch request failed");
        } else if ([matches count] > 1) {
            QMALog(@"Error: More than one target with the same name: %@", paramValue);
        } else if ([matches count] == 0) {
            QMALog(@"No target named '%@' in the database", paramValue);
        } else {
            self.poiTBVC.target = [matches firstObject];
        }
        
    } else if ([action isEqualToString:@"targetTrackEnded"]) {
        self.poiTBVC.target = nil;
    
    } else if ([action isEqualToString:@"poiTouchEnded"]) {
        
        NSString *target = [[paramValue componentsSeparatedByString:@"-"] firstObject];
        NSString *poiNum = [[paramValue componentsSeparatedByString:@"-"] lastObject];
        
        NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
        request.predicate = [NSPredicate predicateWithFormat:@"target.label = %@ AND index = %@", target, poiNum];
        NSArray *matches = [self.managedDocument.managedObjectContext executeFetchRequest:request error:nil];
        
        if (!matches) {
            QMALog(@"Error: Fetch request failed");
        } else if ([matches count] > 1) {
            QMALog(@"Error: More than one POI with Index number %@ for target %@", poiNum, target);
        } else if ([matches count] == 0) {
            QMALog(@"No target with Index number '%@' for target %@", poiNum, target);
        } else {
            _selectedPOI = [matches firstObject];
            [self performSegueWithIdentifier:@"SegueToPoiDisplay" sender:self];
        }
        
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
