
#import "QMACheckPointVC.h"


@interface QMACheckPointVC ()

@end


@implementation QMACheckPointVC

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    //In the application's property list (InfoPlist.string), the UIApplicationExitsOnSuspend key is set to
    //YES. This forces the app termination on exit (we want the application to always start from the
    //beginning so we can check the user's location and direct him accordingly every time the app is launched).
    //That being the case, we clean all old VCs that are sitting in the navigation controller's stack on
    //every new launch
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    [self performSelector:@selector(moveOn) withObject:nil afterDelay:2.0];
}

#pragma mark - Segue

- (void)moveOn {
    [self performSegueWithIdentifier:@"SegueToWelcomeVC" sender:self];
}

@end
